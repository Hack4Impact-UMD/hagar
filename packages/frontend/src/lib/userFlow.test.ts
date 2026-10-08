import type { UserProfile, UserStage } from "@repo/common";
import { describe, expect, it } from "vitest";
import { homeFor, redirectFor } from "@frontend/lib/userFlow.ts";

function profileIn(stage: UserStage) {
  return { stage } as UserProfile;
}

const PAGES = [
  "/login",
  "/signup",
  "/profile-setup",
  "/verify-email",
  "/awaiting-approval",
  "/",
  "/profile",
  "/user-management",
];

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
      const allowed = page === home || (profile === null && page === "/signup");
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
    for (const page of ["/", "/profile", "/user-management"]) {
      expect({ page, to: redirectFor(active, page) }).toEqual({
        page,
        to: null,
      });
    }
    for (const page of PAGES.slice(0, 5)) {
      expect({ page, to: redirectFor(active, page) }).toEqual({
        page,
        to: "/",
      });
    }
  });
});
