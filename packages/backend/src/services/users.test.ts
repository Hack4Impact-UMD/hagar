import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  completeProfile,
  getOrCreateUserProfile,
} from "@backend/services/users.ts";

/** Just enough of Firestore for single-document transactions. */
function fakeDb(initial: Record<string, unknown> = {}) {
  const docs = new Map(Object.entries(initial));
  const write = ({ id }: { id: string }, data: unknown) => docs.set(id, data);
  const db = {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: ({ id }: { id: string }) =>
          Promise.resolve({ exists: docs.has(id), data: () => docs.get(id) }),
        create: write,
        set: write,
      }),
  };
  return { db: db as unknown as Firestore, docs };
}

const unverified = {
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: false,
};
const verified = { ...unverified, emailVerified: true };

const details = {
  photoUrl: "https://example.com/me.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US" as const,
};

const settingUp = {
  stage: "PROFILE SETUP",
  photoUrl: null,
  phoneNumber: null,
  firstName: null,
  lastName: null,
  region: null,
  role: "Viewer",
  createdAt: 1,
};

describe("getOrCreateUserProfile", () => {
  it("creates a Viewer profile in setup on first call", async () => {
    const { db, docs } = fakeDb();

    const profile = await getOrCreateUserProfile(db, verified);

    expect(profile).toMatchObject({
      uid: "user-1",
      email: "demo@example.com",
      stage: "PROFILE SETUP",
      role: "Viewer",
      region: null,
    });
    expect(docs.get("user-1")).not.toHaveProperty("email");
  });

  it("returns the stored profile and drops unknown fields", async () => {
    const { db } = fakeDb({
      "user-1": {
        ...details,
        stage: "ACTIVE",
        region: "New Zealand",
        role: "Local Admin",
        createdAt: 1,
        legacy: "stray",
      },
    });

    const profile = await getOrCreateUserProfile(db, verified);

    expect(profile).toMatchObject({
      stage: "ACTIVE",
      firstName: "Ada",
      region: "New Zealand",
    });
    expect(profile).not.toHaveProperty("legacy");
  });

  it("rejects a submitted document with missing details", async () => {
    const { db } = fakeDb({
      "user-1": {
        ...settingUp,
        ...details,
        stage: "AWAITING APPROVAL",
        firstName: null,
      },
    });

    await expect(getOrCreateUserProfile(db, verified)).rejects.toThrow(
      "firstName",
    );
  });

  it("rejects a document with an unknown role", async () => {
    const { db } = fakeDb({ "user-1": { ...settingUp, role: "Owner" } });

    await expect(getOrCreateUserProfile(db, verified)).rejects.toThrow("role");
  });
});

describe("completeProfile", () => {
  it("saves the details and moves to email verification", async () => {
    const { db, docs } = fakeDb({ "user-1": settingUp });

    const profile = await completeProfile(db, unverified, details);

    expect(profile).toMatchObject({ ...details, stage: "EMAIL VERIFICATION" });
    expect(docs.get("user-1")).toEqual({
      ...details,
      stage: "EMAIL VERIFICATION",
      role: "Viewer",
      createdAt: 1,
    });
  });

  it("skips email verification when the email is already verified", async () => {
    const { db } = fakeDb({ "user-1": settingUp });

    const profile = await completeProfile(db, verified, details);

    expect(profile.stage).toBe("AWAITING APPROVAL");
  });

  it("rejects a user who already finished setup", async () => {
    const { db } = fakeDb({
      "user-1": { ...settingUp, ...details, stage: "AWAITING APPROVAL" },
    });

    await expect(
      completeProfile(db, unverified, details),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("rejects a user with no profile", async () => {
    const { db } = fakeDb();

    await expect(
      completeProfile(db, unverified, details),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("email verification", () => {
  const verifying = { ...settingUp, ...details, stage: "EMAIL VERIFICATION" };

  it("moves a verified user to awaiting approval when the profile is read", async () => {
    const { db, docs } = fakeDb({ "user-1": verifying });

    const profile = await getOrCreateUserProfile(db, verified);

    expect(profile.stage).toBe("AWAITING APPROVAL");
    expect(docs.get("user-1")).toMatchObject({ stage: "AWAITING APPROVAL" });
  });

  it("keeps an unverified user in email verification", async () => {
    const { db, docs } = fakeDb({ "user-1": verifying });

    const profile = await getOrCreateUserProfile(db, unverified);

    expect(profile.stage).toBe("EMAIL VERIFICATION");
    expect(docs.get("user-1")).toMatchObject({ stage: "EMAIL VERIFICATION" });
  });

  it("does not move a verified user who has not finished profile setup", async () => {
    const { db } = fakeDb({ "user-1": settingUp });

    const profile = await getOrCreateUserProfile(db, verified);

    expect(profile.stage).toBe("PROFILE SETUP");
  });
});
