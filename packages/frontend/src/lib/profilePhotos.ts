import {
  isProfilePhotoType,
  MAX_PROFILE_PHOTO_BYTES,
  profilePhotoExtensions,
  profilePhotoFolder,
} from "@repo/common";
import { queryOptions, skipToken } from "@tanstack/react-query";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@frontend/lib/firebase.ts";

/** For a file input's `accept` attribute. */
export const PROFILE_PHOTO_ACCEPT = Object.keys(profilePhotoExtensions).join(
  ",",
);

/** Why `file` can't be a profile photo, or `null` if it can. */
export function profilePhotoProblem(file: File): string | null {
  if (!isProfilePhotoType(file.type)) {
    return "Choose a PNG, JPEG, or WebP image.";
  }
  if (file.size >= MAX_PROFILE_PHOTO_BYTES) {
    return "Choose an image under 5 MB.";
  }
  return null;
}

/**
 * Uploads a photo to the signed-in user's folder and returns the path to save
 * on their profile. Uploading does not change the profile: the photo only
 * takes effect once that path is saved, and the backend then deletes the
 * photo it replaced.
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before uploading a photo.");
  const problem = profilePhotoProblem(file);
  if (problem || !isProfilePhotoType(file.type)) {
    throw new Error(problem ?? "Choose a PNG, JPEG, or WebP image.");
  }

  const extension = profilePhotoExtensions[file.type];
  const path = `${profilePhotoFolder(user.uid)}${crypto.randomUUID()}.${extension}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

/** Looks up the URL to show a stored photo, e.g. in an `<img>`. */
export function profilePhotoUrlOptions(path: string | null) {
  return queryOptions({
    queryKey: ["profilePhotoUrl", path],
    queryFn:
      path === null ? skipToken : () => getDownloadURL(ref(storage, path)),
    // A new photo always gets a new path, so a path's URL never changes.
    staleTime: Infinity,
  });
}
