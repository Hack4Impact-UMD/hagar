import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContext } from "@backend/trpc/context.ts";

const auth = vi.hoisted(() => ({
  verifyIdToken: vi.fn<(token: string) => Promise<Partial<DecodedIdToken>>>(),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => auth }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({}) }));

beforeEach(() => {
  auth.verifyIdToken.mockReset();
});

async function sessionFor(authorization?: string) {
  const options = { req: { headers: { authorization } } };
  const context = await createContext(
    options as unknown as CreateExpressContextOptions,
  );
  return context.session;
}

describe("createContext", () => {
  it("resolves the session from a valid token", async () => {
    auth.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "demo@example.com",
      email_verified: true,
    });

    await expect(sessionFor("Bearer good-token")).resolves.toEqual({
      uid: "user-1",
      email: "demo@example.com",
      emailVerified: true,
    });
    expect(auth.verifyIdToken).toHaveBeenCalledWith("good-token");
  });

  it("treats a missing or malformed header as signed out", async () => {
    await expect(sessionFor()).resolves.toBeNull();
    await expect(sessionFor("Basic abc")).resolves.toBeNull();
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("treats an invalid token as signed out", async () => {
    auth.verifyIdToken.mockRejectedValue(new Error("Token expired."));

    await expect(sessionFor("Bearer bad-token")).resolves.toBeNull();
  });

  it("treats an account without an email as signed out", async () => {
    auth.verifyIdToken.mockResolvedValue({ uid: "anonymous-1" });

    await expect(sessionFor("Bearer no-email")).resolves.toBeNull();
  });
});
