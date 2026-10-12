import { type } from "arktype";

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
  role: userRole,
  createdAt: "number",
});

// Length caps exist only to bound abuse. They sit far above any real value,
// so no genuine user should ever reach them.
const photoUrl = type("string.url").and("string <= 4096");
const phoneNumber = type("string <= 100");
const name = type("string <= 500");

/**
 * The profile is created at first sign-in, before the user has entered any
 * details, so every detail may be null until they finish setting it up.
 */
const incompleteDetails = type({
  stage: "'PROFILE SETUP'",
  photoUrl: photoUrl.or("null"),
  phoneNumber: phoneNumber.or("null"),
  firstName: name.or("null"),
  lastName: name.or("null"),
  region: userRegion.or("null"),
});

/** A user can only leave profile setup once their profile is complete. */
const completeDetails = type({
  stage: "'EMAIL VERIFICATION' | 'AWAITING APPROVAL' | 'ACTIVE'",
  photoUrl,
  phoneNumber: phoneNumber.and("string >= 1"),
  firstName: name.and("string >= 1"),
  lastName: name.and("string >= 1"),
  region: userRegion,
});

/** What the profile setup form submits. */
export const completeProfileInput = completeDetails.omit("stage");
export type CompleteProfileInput = typeof completeProfileInput.infer;

/**
 * The shape stored at `users/{uid}`. `uid` is the document id and `email` is
 * owned by Firebase Auth, so neither is persisted.
 */
export const storedUserProfile = storedBase.and(
  incompleteDetails.or(completeDetails),
);
export type StoredUserProfile = typeof storedUserProfile.infer;

/**
 * The signed-in user as the client sees it, returned by `me`. `uid` and
 * `email` come from the verified token on every request; everything else is
 * read from the user's Firestore document. Rule out `'PROFILE SETUP'` on
 * `stage` to narrow to a complete profile.
 */
export const userProfile = type({
  uid: "string",
  email: "string | null",
}).and(storedUserProfile);
export type UserProfile = typeof userProfile.infer;
