import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";

// The procedures delegate to this service, which has its own tests.
vi.mock("@backend/services/users.ts", () => ({
  getOrCreateUserProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
  completeProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
}));

/**
 * Procedures are called directly, so these tests need no emulator and no
 * HTTP. Copy this pattern when you add a procedure.
 */
function caller(session: Context["session"]) {
  // The only Firestore caller, the users service, is mocked above.
  const db = undefined as unknown as Firestore;
  return createCaller({ session, db });
}

const anonymous = caller(null);
const signedIn = caller({
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: true,
});

const details = {
  photoUrl: "https://example.com/me.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US" as const,
};

describe("appRouter", () => {
  it("rejects every procedure without a token", async () => {
    for (const call of [
      () => anonymous.me(),
      () => anonymous.users.completeProfile(details),
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
  });
});
