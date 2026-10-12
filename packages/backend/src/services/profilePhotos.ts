import { isOwnProfilePhoto, profilePhotoFolder } from "@repo/common";
import { TRPCError } from "@trpc/server";
import { getStorage } from "firebase-admin/storage";

/**
 * Refuses a photo outside the caller's folder. Without this a user could point
 * their profile at someone else's photo, and replacing it later would delete
 * the other user's file.
 */
export function assertOwnProfilePhoto(uid: string, path: string): void {
  if (!isOwnProfilePhoto(uid, path)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Profile photos must be uploaded to your own folder.",
    });
  }
}

/** Deletes one photo. A photo that is already gone counts as deleted. */
export async function deleteProfilePhoto(path: string): Promise<void> {
  await getStorage().bucket().file(path).delete({ ignoreNotFound: true });
}

/**
 * Deletes everything in a user's photo folder, including uploads that never
 * made it onto their profile.
 */
export async function deleteProfilePhotos(uid: string): Promise<void> {
  await getStorage()
    .bucket()
    .deleteFiles({ prefix: profilePhotoFolder(uid) });
}
