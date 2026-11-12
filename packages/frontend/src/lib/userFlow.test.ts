import type { UserProfile, UserStage } from "@repo/common";
import { describe, expect, it } from "vitest";
import { homeFor, redirectFor } from "@frontend/lib/userFlow.ts";

function profileIn(stage: UserStage) {
  return { stage } as UserProfile;
}

const SIGNED_OUT_PAGES = ["/login", "/signup", "/forgot-password"];

// Sign-in and onboarding pages, which an active user is sent home from.
const GATE_PAGES = [
  ...SIGNED_OUT_PAGES,
  "/profile-setup",
  "/verify-email",
  "/awaiting-approval",
];

const APP_PAGES = ["/", "/profile", "/user-management"];

const PAGES = [...GATE_PAGES, ...APP_PAGES];

describe("redirectFor", () => {
  const cases: [string, UserProfile | null, string][] = [
    ["signed out", null, "/login"],
    ["in profile setup", profileIn("PROFILE SETUP"), "/profile-setup"],
    ["verifying email", profileIn("EMAIL VERIFICATION"), "/verify-email"],
    ["awaiting approval", profileIn("AWAITING APPROVAL"), "/awaiting-approval"],
  ];

  it.each(cases)("pins a user who is %s to %s", (_, profile, home) => {
    expect(homeFor(profile)).toBe(home);
    for (const page of PAGES) {
      const allowed =
        page === home || (profile === null && SIGNED_OUT_PAGES.includes(page));
      // Wrapping the page in the assertion names it in any failure.
      expect({ page, to: redirectFor(profile, page) }).toEqual({
        page,
        to: allowed ? null : home,
      });
    }
  });

  it("lets an active user anywhere except sign-in and onboarding", () => {
    const active = profileIn("ACTIVE");
    expect(homeFor(active)).toBe("/");
    for (const page of APP_PAGES) {
      expect({ page, to: redirectFor(active, page) }).toEqual({
        page,
        to: null,
      });
    }
    for (const page of GATE_PAGES) {
      expect({ page, to: redirectFor(active, page) }).toEqual({
        page,
        to: "/",
      });
    }
  });

  it.each([
    ["signed out", null],
    ["in profile setup", profileIn("PROFILE SETUP")],
    ["verifying email", profileIn("EMAIL VERIFICATION")],
    ["awaiting approval", profileIn("AWAITING APPROVAL")],
    ["active", profileIn("ACTIVE")],
  ])("lets a user who is %s open email links", (_, profile) => {
    expect(redirectFor(profile, "/auth-action")).toBeNull();
  });
});
