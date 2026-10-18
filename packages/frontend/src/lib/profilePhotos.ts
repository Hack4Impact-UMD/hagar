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
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
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

/** Every cached photo URL, for invalidating them after a new upload. */
export const PROFILE_PHOTO_URL_KEY = ["profilePhotoUrl"] as const;

/**
 * Adds a random query parameter that the server ignores. A user's photo
 * always lives at the same path, so without it the browser would keep showing
 * its cached copy of the previous photo after a new one is uploaded.
 */
export function withCacheBuster(url: string): string {
  const busted = new URL(url);
  busted.searchParams.set("cb", crypto.randomUUID());
  return busted.toString();
}

/** Looks up the URL to show a stored photo, e.g. in an `<img>`. */
export function profilePhotoUrlOptions(path: string | null) {
  return queryOptions({
    queryKey: [...PROFILE_PHOTO_URL_KEY, path],
    queryFn:
      path === null
        ? skipToken
        : async () => withCacheBuster(await getDownloadURL(ref(storage, path))),
    // The URL only changes when the photo does, and uploading one
    // invalidates it.
    staleTime: Infinity,
  });
}
