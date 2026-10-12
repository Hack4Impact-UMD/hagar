import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";

const details = {
  photoUrl: "https://example.com/me.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US" as const,
};

// Keyed by uid. The middleware reads these through the mocked service below.
const profiles: Record<string, object> = {
  "awaiting-1": { ...details, stage: "AWAITING APPROVAL", role: "Viewer" },
  "viewer-1": { ...details, stage: "ACTIVE", role: "Viewer" },
  "admin-1": { ...details, stage: "ACTIVE", role: "Local Admin" },
};

// The procedures delegate to this service, which has its own tests.
vi.mock("@backend/services/users.ts", () => ({
  getOrCreateUserProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
  findUserProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve(
      session.uid in profiles
        ? { uid: session.uid, ...profiles[session.uid] }
        : null,
    ),
  completeProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
  updateProfile: (_db: unknown, profile: { uid: string }) =>
    Promise.resolve({ uid: profile.uid }),
}));

// Each returns the caller it was handed, to show the middleware passed it on.
vi.mock("@backend/services/userManagement.ts", () => {
  const echoActor = (_db: unknown, actor: { uid: string }) =>
    Promise.resolve({ actor: actor.uid });
  return {
    listUsers: echoActor,
    approveUser: echoActor,
    setUserRole: echoActor,
    setUserRegion: echoActor,
    deleteUser: echoActor,
  };
});

/**
 * Procedures are called directly, so these tests need no emulator and no
 * HTTP. Copy this pattern when you add a procedure.
 */
function caller(session: Context["session"]) {
  // The only Firestore caller, the users service, is mocked above.
  const db = undefined as unknown as Firestore;
  return createCaller({ session, db });
}

function signedInAs(uid: string) {
  return caller({ uid, email: `${uid}@example.com`, emailVerified: true });
}

const anonymous = caller(null);
const signedIn = signedInAs("user-1");
const awaiting = signedInAs("awaiting-1");
const viewer = signedInAs("viewer-1");
const admin = signedInAs("admin-1");

type Caller = ReturnType<typeof caller>;

const activeCalls = [
  (as: Caller) => as.users.updateProfile({ firstName: "Grace" }),
];

const adminCalls = [
  (as: Caller) => as.users.list({ stage: "AWAITING APPROVAL" }),
  (as: Caller) => as.users.approve({ uid: "other" }),
  (as: Caller) => as.users.setRole({ uid: "other", role: "Viewer" }),
  (as: Caller) => as.users.setRegion({ uid: "other", region: "Canada" }),
  (as: Caller) => as.users.delete({ uid: "other" }),
];

describe("appRouter", () => {
  it("rejects every procedure without a token", async () => {
    for (const call of [
      () => anonymous.me(),
      () => anonymous.users.completeProfile(details),
      ...[...activeCalls, ...adminCalls].map((call) => () => call(anonymous)),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("passes the session to a protected procedure", async () => {
    await expect(signedIn.me()).resolves.toMatchObject({ uid: "user-1" });
  });

  it("validates profile details with the shared arktype schema", async () => {
    await expect(
      signedIn.users.completeProfile({ ...details, firstName: "" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      viewer.users.updateProfile({ firstName: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects active and admin procedures for users who are not approved", async () => {
    for (const as of [signedIn, awaiting]) {
      for (const call of [...activeCalls, ...adminCalls]) {
        await expect(call(as)).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
    }
  });

  it("passes the profile to an active procedure", async () => {
    await expect(
      viewer.users.updateProfile({ firstName: "Grace" }),
    ).resolves.toMatchObject({ uid: "viewer-1" });
  });

  it("rejects admin procedures for a Viewer", async () => {
    for (const call of adminCalls) {
      await expect(call(viewer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("passes the admin's profile to the user management services", async () => {
    for (const call of adminCalls) {
      await expect(call(admin)).resolves.toEqual({ actor: "admin-1" });
    }
  });

  it("rejects undeclared keys so callers cannot set fields like role", async () => {
    await expect(
      signedIn.users.completeProfile({
        ...details,
        role: "Global Admin",
      } as typeof details),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      viewer.users.updateProfile({ role: "Global Admin" } as object),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
