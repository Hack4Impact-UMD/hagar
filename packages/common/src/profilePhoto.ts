import { type } from "arktype";

/**
 * Profile photos live in Cloud Storage at `profile-photos/<uid>/<uuid>.<ext>`,
 * and the profile stores that path. The uid folder ties each photo to its
 * owner: `storage.rules` only lets a user upload into their own folder, and
 * the backend only accepts or deletes paths inside it, so nobody can claim or
 * delete someone else's photo.
 */
export const profilePhotoExtensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type ProfilePhotoType = keyof typeof profilePhotoExtensions;

/** Keep in step with the size limit in `storage.rules`. */
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export const profilePhotoPath = type(
  /^profile-photos\/[^/]{1,128}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/,
);

export function profilePhotoFolder(uid: string): string {
  return `profile-photos/${uid}/`;
}

export function isOwnProfilePhoto(uid: string, path: string): boolean {
  return path.startsWith(profilePhotoFolder(uid));
}

export function isProfilePhotoType(type: string): type is ProfilePhotoType {
  return Object.hasOwn(profilePhotoExtensions, type);
}
