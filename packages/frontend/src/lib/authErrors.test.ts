import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { isDeadLink } from "@frontend/lib/authErrors.ts";

describe("isDeadLink", () => {
  it.each(["auth/expired-action-code", "auth/invalid-action-code"])(
    "treats %s as a link that can't be retried",
    (code) => {
      expect(isDeadLink(new FirebaseError(code, ""))).toBe(true);
    },
  );

  it.each([
    "auth/network-request-failed",
    "auth/too-many-requests",
    "auth/user-disabled",
  ])("leaves %s retryable", (code) => {
    expect(isDeadLink(new FirebaseError(code, ""))).toBe(false);
  });

  it("leaves errors that aren't from Firebase retryable", () => {
    expect(isDeadLink(new Error("auth/expired-action-code"))).toBe(false);
  });
});
