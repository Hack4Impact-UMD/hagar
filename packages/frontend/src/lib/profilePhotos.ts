import {
  isProfilePhotoType,
  MAX_PROFILE_PHOTO_BYTES,
  ownProfilePhotoPath,
  profilePhotoTypes,
} from "@repo/common";
import { queryOptions, skipToken } from "@tanstack/react-query";
import {
  getDownloadURL,
  getMetadata,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, storage } from "@frontend/lib/firebase.ts";
import { queryClient } from "@frontend/lib/trpc.ts";

/** For a file input's `accept` attribute. */
export const PROFILE_PHOTO_ACCEPT = profilePhotoTypes.join(",");

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

const PHOTO_URL_KEY = ["profilePhotoUrl"];

/**
 * Uploads a photo over the signed-in user's avatar and returns the path to
 * save on their profile. The path is the same every time, so the new photo is
 * live as soon as the upload finishes, before the profile is saved. Callers
 * should upload only when the user commits to the change.
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before uploading a photo.");
  const problem = profilePhotoProblem(file);
  if (problem || !isProfilePhotoType(file.type)) {
    throw new Error(problem ?? "Choose a PNG, JPEG, or WebP image.");
  }

  const path = ownProfilePhotoPath(user.uid);
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  await queryClient.invalidateQueries({ queryKey: PHOTO_URL_KEY });
  return path;
}

/** Looks up the URL to show a stored photo, e.g. in an `<img>`. */
export function profilePhotoUrlOptions(path: string | null) {
  return queryOptions({
    queryKey: [...PHOTO_URL_KEY, path],
    queryFn:
      path === null
        ? skipToken
        : async () => {
            const photo = ref(storage, path);
            const [url, metadata] = await Promise.all([
              getDownloadURL(photo),
              getMetadata(photo),
            ]);
            // The path never changes when the photo does, so the generation
            // number keeps the browser from showing a cached older photo.
            const versioned = new URL(url);
            versioned.searchParams.set("v", metadata.generation);
            return versioned.toString();
          },
    // The URL only changes when a new photo is uploaded, which invalidates it.
    staleTime: Infinity,
  });
}
