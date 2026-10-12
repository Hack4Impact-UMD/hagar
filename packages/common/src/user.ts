import { type } from "arktype";
import { profilePhotoPath } from "@common/profilePhoto.ts";

export const userRegions = [
  "US",
  "Canada",
  "Australia",
  "New Zealand",
] as const;
export const userRegion = type.enumerated(...userRegions);
export type UserRegion = typeof userRegion.infer;

export const userRole = type("'Global Admin' | 'Local Admin' | 'Viewer'");
export type UserRole = typeof userRole.infer;

export const userStage = type(
  "'PROFILE SETUP' | 'EMAIL VERIFICATION' | 'AWAITING APPROVAL' | 'ACTIVE'",
);
export type UserStage = typeof userStage.infer;

const storedBase = type({
  // Copied from Firebase Auth so admins can see who they are managing.
  // Firebase Auth stays the source of truth (see `getOrCreateUserProfile`).
  email: "string",
  role: userRole,
  createdAt: "number",
});

// Length caps exist only to bound abuse. They sit far above any real value,
// so no genuine user should ever reach them.
const phoneNumber = type("string <= 100");
const name = type("string <= 500");

/**
 * The profile is created at first sign-in, before the user has entered any
 * details, so every detail may be null until they finish setting it up.
 */
const incompleteDetails = type({
  stage: "'PROFILE SETUP'",
  photoPath: profilePhotoPath.or("null"),
  phoneNumber: phoneNumber.or("null"),
  firstName: name.or("null"),
  lastName: name.or("null"),
  region: userRegion.or("null"),
});

/** A user can only leave profile setup once their profile is complete. */
const completeDetails = type({
  stage: "'EMAIL VERIFICATION' | 'AWAITING APPROVAL' | 'ACTIVE'",
  photoPath: profilePhotoPath,
  phoneNumber: phoneNumber.and("string >= 1"),
  firstName: name.and("string >= 1"),
  lastName: name.and("string >= 1"),
  region: userRegion,
});

/**
 * What the profile setup form submits.
 *
 * Every procedure input in this file rejects undeclared keys. ArkType passes
 * them through by default, so a `role` sent alongside the form would reach
 * the stored document and let a user promote themselves.
 */
export const completeProfileInput = completeDetails
  .omit("stage")
  .onUndeclaredKey("reject");
export type CompleteProfileInput = typeof completeProfileInput.infer;

/** The shape stored at `users/{uid}`. `uid` is the document id. */
export const storedUserProfile = storedBase.and(
  incompleteDetails.or(completeDetails),
);
export type StoredUserProfile = typeof storedUserProfile.infer;

/**
 * A user's profile, as returned by `me` and the user management procedures.
 * Rule out `'PROFILE SETUP'` on `stage` to narrow to a complete profile.
 */
export const userProfile = type({ uid: "string" }).and(storedUserProfile);
export type UserProfile = typeof userProfile.infer;

/** A profile that has been approved. Only these users may use the app. */
export type ActiveUserProfile = UserProfile & { stage: "ACTIVE" };

export function isActive(profile: UserProfile): profile is ActiveUserProfile {
  return profile.stage === "ACTIVE";
}

const adminRoles: readonly UserRole[] = ["Global Admin", "Local Admin"];

/** Admins can open user management. What they may change is narrower. */
export function isAdminRole(role: UserRole): boolean {
  return adminRoles.includes(role);
}

/**
 * What the profile page submits. Region is left out because it decides which
 * Local Admins manage the user, so only admins may change it.
 */
export const updateProfileInput = completeDetails
  .pick("photoPath", "phoneNumber", "firstName", "lastName")
  .partial()
  .onUndeclaredKey("reject");
export type UpdateProfileInput = typeof updateProfileInput.infer;

// Firebase Auth caps uids at 128 characters.
const uid = type("0 < string <= 128");

/** Users who have not finished onboarding are not listed for management. */
export const listUsersInput = type({
  stage: "'AWAITING APPROVAL' | 'ACTIVE'",
  "region?": userRegion,
}).onUndeclaredKey("reject");
export type ListUsersInput = typeof listUsersInput.infer;

export const approveUserInput = type({
  uid,
  "role?": userRole,
}).onUndeclaredKey("reject");
export type ApproveUserInput = typeof approveUserInput.infer;

export const setUserRoleInput = type({ uid, role: userRole }).onUndeclaredKey(
  "reject",
);
export type SetUserRoleInput = typeof setUserRoleInput.infer;

export const setUserRegionInput = type({
  uid,
  region: userRegion,
}).onUndeclaredKey("reject");
export type SetUserRegionInput = typeof setUserRegionInput.infer;

export const deleteUserInput = type({ uid }).onUndeclaredKey("reject");
export type DeleteUserInput = typeof deleteUserInput.infer;
