import type { UserProfile, UserStage } from "@repo/common";

const STAGE_PAGES = {
  "PROFILE SETUP": "/profile-setup",
  "EMAIL VERIFICATION": "/verify-email",
  "AWAITING APPROVAL": "/awaiting-approval",
  ACTIVE: "/",
} as const satisfies Record<UserStage, string>;

const SIGNED_OUT_PAGES = ["/login", "/signup"] as const;

type FlowPage =
  | (typeof STAGE_PAGES)[UserStage]
  | (typeof SIGNED_OUT_PAGES)[number];

// Pages that belong to signing in or onboarding. An active user has no
// reason to see them again.
const GATE_PAGES = new Set<string>([
  ...SIGNED_OUT_PAGES,
  STAGE_PAGES["PROFILE SETUP"],
  STAGE_PAGES["EMAIL VERIFICATION"],
  STAGE_PAGES["AWAITING APPROVAL"],
]);

/** The page a user belongs on. `null` means signed out. */
export function homeFor(profile: UserProfile | null): FlowPage {
  return profile ? STAGE_PAGES[profile.stage] : "/login";
}

/**
 * Where to send a user who asked for `pathname`, or `null` to let them
 * through. Signed-out users may only sign in or sign up, users in onboarding
 * are pinned to their stage's page, and active users may go anywhere except
 * the sign-in and onboarding pages.
 */
export function redirectFor(
  profile: UserProfile | null,
  pathname: string,
): FlowPage | null {
  if (!profile) {
    return (SIGNED_OUT_PAGES as readonly string[]).includes(pathname)
      ? null
      : "/login";
  }

  const home = homeFor(profile);
  if (profile.stage === "ACTIVE") return GATE_PAGES.has(pathname) ? home : null;
  return pathname === home ? null : home;
}
