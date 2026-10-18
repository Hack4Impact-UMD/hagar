import { type } from "arktype";

/**
 * Each user has a single profile photo in Cloud Storage at
 * `profile-photos/<uid>/avatar`, and the profile stores that path. Saving a new
 * photo overwrites the file, so a user never has more than one and abandoned
 * uploads cannot pile up. The name has no extension because the file type
 * can change; the content type is kept as object metadata.
 *
 * The uid folder ties the photo to its owner: `storage.rules` only lets a
 * user write into their own folder, and the backend only accepts the path
 * for the caller's own uid.
 */
export const profilePhotoTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export type ProfilePhotoType = (typeof profilePhotoTypes)[number];

/** Keep in step with the size limit in `storage.rules`. */
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export const profilePhotoPath = type(/^profile-photos\/[^/]{1,128}\/avatar$/);

export function profilePhotoFolder(uid: string): string {
  return `profile-photos/${uid}/`;
}

export function ownProfilePhotoPath(uid: string): string {
  return `${profilePhotoFolder(uid)}avatar`;
}

export function isOwnProfilePhoto(uid: string, path: string): boolean {
  return path === ownProfilePhotoPath(uid);
}

export function isProfilePhotoType(type: string): type is ProfilePhotoType {
  return (profilePhotoTypes as readonly string[]).includes(type);
}
