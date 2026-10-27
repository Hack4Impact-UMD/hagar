import type { ActiveUserProfile, StoredUserProfile } from "@repo/common";
import type { Firestore } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  completeProfile,
  findUserProfile,
  getOrCreateUserProfile,
  getUserInfo,
  updateProfile,
} from "@backend/services/users.ts";

const photos = vi.hoisted(() => ({
  deleteProfilePhoto: vi.fn<(path: string) => Promise<void>>(),
}));
vi.mock("@backend/services/profilePhotos.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteProfilePhoto: photos.deleteProfilePhoto,
}));

beforeEach(() => {
  photos.deleteProfilePhoto.mockReset();
  photos.deleteProfilePhoto.mockImplementation(() => Promise.resolve());
});

/** Just enough of Firestore for single-document reads and transactions. */
function fakeDb(initial: Record<string, unknown> = {}) {
  const docs = new Map(Object.entries(initial));
  const read = ({ id }: { id: string }) =>
    Promise.resolve({ exists: docs.has(id), data: () => docs.get(id) });
  const write = ({ id }: { id: string }, data: unknown) => docs.set(id, data);
  const db = {
    collection: () => ({
      doc: (id: string) => ({ id, get: () => read({ id }) }),
    }),
    runTransaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ get: read, create: write, set: write }),
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
  photoPath: "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US" as const,
};

const settingUp = {
  stage: "PROFILE SETUP",
  photoPath: null,
  phoneNumber: null,
  firstName: null,
  lastName: null,
  region: null,
  role: "Viewer",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("getOrCreateUserProfile", () => {
  it("creates a Viewer profile in setup on first call", async () => {
    const { db } = fakeDb();

    const profile = await getOrCreateUserProfile(db, verified);

    expect(profile).toMatchObject({
      uid: "user-1",
      email: "demo@example.com",
      stage: "PROFILE SETUP",
      role: "Viewer",
      region: null,
    });
  });

  it("returns the stored profile and drops unknown fields", async () => {
    const { db } = fakeDb({
      "user-1": {
        ...details,
        stage: "ACTIVE",
        region: "New Zealand",
        role: "Local Admin",
        createdAt: "2024-01-01T00:00:00.000Z",
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

describe("stored email", () => {
  it("stores the email on a new profile", async () => {
    const { db, docs } = fakeDb();

    await getOrCreateUserProfile(db, verified);

    expect(docs.get("user-1")).toMatchObject({ email: "demo@example.com" });
  });

  it("refreshes a missing or outdated stored email", async () => {
    for (const email of [undefined, "old@example.com"]) {
      const { db, docs } = fakeDb({ "user-1": { ...settingUp, email } });

      await getOrCreateUserProfile(db, verified);

      expect(docs.get("user-1")).toMatchObject({ email: "demo@example.com" });
    }
  });

  it("returns the token's email over an outdated stored one", async () => {
    const stored = { ...settingUp, email: "old@example.com" };
    const { db, docs } = fakeDb({ "user-1": stored });

    const profile = await findUserProfile(db, verified);

    expect(profile).toMatchObject({ email: "demo@example.com" });
    // Only `getOrCreateUserProfile` writes the refreshed email.
    expect(docs.get("user-1")).toBe(stored);
  });
});

describe("findUserProfile", () => {
  it("returns the stored profile without writing", async () => {
    const stored = {
      ...details,
      stage: "ACTIVE",
      role: "Viewer",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const { db, docs } = fakeDb({ "user-1": stored });

    const profile = await findUserProfile(db, verified);

    expect(profile).toEqual({
      uid: "user-1",
      email: "demo@example.com",
      ...stored,
    });
    expect(docs.get("user-1")).toBe(stored);
  });

  it("returns null and creates nothing for a user with no profile", async () => {
    const { db, docs } = fakeDb();

    await expect(findUserProfile(db, verified)).resolves.toBeNull();
    expect(docs.size).toBe(0);
  });
});

describe("completeProfile", () => {
  it("saves the details and moves to email verification", async () => {
    const { db, docs } = fakeDb({ "user-1": settingUp });

    const profile = await completeProfile(db, unverified, details);

    expect(profile).toMatchObject({ ...details, stage: "EMAIL VERIFICATION" });
    expect(docs.get("user-1")).toEqual({
      ...details,
      email: "demo@example.com",
      stage: "EMAIL VERIFICATION",
      role: "Viewer",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("refuses a photo from someone else's folder", async () => {
    const { db, docs } = fakeDb({ "user-1": settingUp });

    await expect(
      completeProfile(db, unverified, {
        ...details,
        photoPath:
          "profile-photos/user-2/123e4567-e89b-42d3-a456-426614174000.png",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(docs.get("user-1")).toBe(settingUp);
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

describe("updateProfile", () => {
  const active = {
    ...details,
    email: "demo@example.com",
    stage: "ACTIVE",
    role: "Local Admin",
    createdAt: "2024-01-01T00:00:00.000Z",
  } as const;
  const profile: ActiveUserProfile = { uid: "user-1", ...active };

  it("saves the edited details and leaves the rest alone", async () => {
    const { db, doc } = fakeFirestore({ users: { "user-1": active } });
    const edits = { firstName: "Grace", phoneNumber: "+15555550199" };

    const updated = await updateProfile(db, profile, edits);

    expect(updated).toEqual({ ...profile, ...edits });
    expect(doc("users", "user-1")).toEqual({ ...active, ...edits });
  });

  it("changes nothing for an empty edit", async () => {
    const { db, doc } = fakeFirestore({ users: { "user-1": active } });

    await expect(updateProfile(db, profile, {})).resolves.toEqual(profile);
    expect(doc("users", "user-1")).toEqual(active);
  });

  it("reports a profile deleted since the request began", async () => {
    const { db } = fakeFirestore();

    await expect(
      updateProfile(db, profile, { firstName: "Grace" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes the photo a new one replaces, once saved", async () => {
    const { db, doc } = fakeFirestore({ users: { "user-1": active } });
    const photoPath =
      "profile-photos/user-1/00000000-0000-4000-8000-000000000000.webp";

    await updateProfile(db, profile, { photoPath });

    expect(doc("users", "user-1")).toEqual({ ...active, photoPath });
    expect(photos.deleteProfilePhoto).toHaveBeenCalledExactlyOnceWith(
      active.photoPath,
    );
  });

  it("keeps the photo when it is not replaced", async () => {
    const { db } = fakeFirestore({ users: { "user-1": active } });

    await updateProfile(db, profile, { firstName: "Grace" });
    await updateProfile(db, profile, { photoPath: active.photoPath });

    expect(photos.deleteProfilePhoto).not.toHaveBeenCalled();
  });

  it("still saves when deleting the old photo fails", async () => {
    const { db, doc } = fakeFirestore({ users: { "user-1": active } });
    const photoPath =
      "profile-photos/user-1/00000000-0000-4000-8000-000000000000.webp";
    photos.deleteProfilePhoto.mockRejectedValue(new Error("Storage is down."));

    await expect(updateProfile(db, profile, { photoPath })).resolves.toEqual({
      ...profile,
      photoPath,
    });
    expect(doc("users", "user-1")).toEqual({ ...active, photoPath });
  });

  it("refuses a photo from someone else's folder", async () => {
    const { db, doc } = fakeFirestore({ users: { "user-1": active } });

    await expect(
      updateProfile(db, profile, {
        photoPath:
          "profile-photos/user-2/123e4567-e89b-42d3-a456-426614174000.png",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(doc("users", "user-1")).toEqual(active);
    expect(photos.deleteProfilePhoto).not.toHaveBeenCalled();
  });

  it("refuses a user sent back to approval since the request began", async () => {
    const awaiting = { ...active, stage: "AWAITING APPROVAL" };
    const { db, doc } = fakeFirestore({ users: { "user-1": awaiting } });

    await expect(
      updateProfile(db, profile, { firstName: "Grace" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "user-1")).toEqual(awaiting);
    expect(photos.deleteProfilePhoto).not.toHaveBeenCalled();
  });
});

function photoOf(uid: string) {
  return `profile-photos/${uid}/123e4567-e89b-42d3-a456-426614174000.png`;
}

function completeUser(
  uid: string,
  stage: "ACTIVE" | "AWAITING APPROVAL",
  firstName: string,
  lastName: string,
): StoredUserProfile {
  return {
    email: `${uid}@example.com`,
    role: "Viewer",
    createdAt: "2024-01-01T00:00:00.000Z",
    stage,
    photoPath: photoOf(uid),
    phoneNumber: "+15555550100",
    firstName,
    lastName,
    region: "US",
  };
}

const INFO_USERS: Record<string, StoredUserProfile> = {
  ada: completeUser("ada", "ACTIVE", "Ada", "Lovelace"),
  grace: completeUser("grace", "AWAITING APPROVAL", "Grace", "Hopper"),
  // Still setting up, so there is no name or photo to show yet.
  newcomer: {
    email: "new@example.com",
    role: "Viewer",
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "PROFILE SETUP",
    photoPath: null,
    phoneNumber: null,
    firstName: null,
    lastName: null,
    region: null,
  },
};

const ADA = {
  uid: "ada",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  photoPath: photoOf("ada"),
};
const GRACE = {
  uid: "grace",
  firstName: "Grace",
  lastName: "Hopper",
  email: "grace@example.com",
  photoPath: photoOf("grace"),
};

/** The profile the middleware would hand the service. */
function callerAs(role: ActiveUserProfile["role"]): ActiveUserProfile {
  return {
    uid: "caller",
    email: "caller@example.com",
    role,
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "ACTIVE",
    photoPath: photoOf("caller"),
    phoneNumber: "+15555550100",
    firstName: "Caller",
    lastName: "Person",
    region: "US",
  };
}

function byUid(infos: { uid: string }[]) {
  return infos.toSorted((a, b) => a.uid.localeCompare(b.uid));
}

describe("getUserInfo", () => {
  it("returns the names, email and photo path of each requested user", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), {
      uids: ["ada", "grace"],
    });

    expect(byUid(infos)).toEqual([ADA, GRACE]);
  });

  it("returns the first and last name in separate fields", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), { uids: ["ada"] });

    expect(infos[0]?.firstName).toBe("Ada");
    expect(infos[0]?.lastName).toBe("Lovelace");
  });

  it("returns the email stored on the profile", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), { uids: ["ada"] });

    expect(infos[0]?.email).toBe("ada@example.com");
  });

  it("returns only the uid, names, email and photo path, nothing else about the user", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), { uids: ["ada"] });

    expect(infos).toEqual([ADA]);
    expect(Object.keys(infos[0] ?? {}).toSorted()).toEqual([
      "email",
      "firstName",
      "lastName",
      "photoPath",
      "uid",
    ]);
  });

  it("returns only the users that were asked for", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), { uids: ["ada"] });

    expect(infos.map((info) => info.uid)).toEqual(["ada"]);
  });

  it("leaves out users who don't exist", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), {
      uids: ["ada", "nobody"],
    });

    expect(infos).toEqual([ADA]);
  });

  it("leaves out users who haven't finished profile setup", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), {
      uids: ["newcomer", "ada"],
    });

    expect(infos).toEqual([ADA]);
  });

  it("includes users who are awaiting approval but have a name and photo", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), {
      uids: ["grace"],
    });

    expect(infos).toEqual([GRACE]);
  });

  it("returns each user once however often their uid is repeated", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    const infos = await getUserInfo(db, callerAs("Viewer"), {
      uids: ["ada", "ada", "ada"],
    });

    expect(infos).toEqual([ADA]);
  });

  it("returns an empty list for no uids", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    await expect(
      getUserInfo(db, callerAs("Viewer"), { uids: [] }),
    ).resolves.toEqual([]);
  });

  it("works for every role", async () => {
    const { db } = fakeFirestore({ users: INFO_USERS });

    for (const role of ["Viewer", "Local Admin", "Global Admin"] as const) {
      await expect(
        getUserInfo(db, callerAs(role), { uids: ["ada"] }),
      ).resolves.toEqual([ADA]);
    }
  });
});
