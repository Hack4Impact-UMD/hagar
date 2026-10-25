import { profilePhotoFolder } from "@repo/common";
import { ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@frontend/lib/firebase.ts";
import { profilePhotoProblem } from "@frontend/lib/profilePhotos.ts";

/**
 * Replaces the signed-in user's profile photo. Every user's photo lives at one
 * fixed path, which their profile already points at, so this overwrites the
 * file and the profile needs no update.
 */
export async function uploadAvatar(file: File): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before uploading a photo.");
  const problem = profilePhotoProblem(file);
  if (problem) throw new Error(problem);

  await uploadBytes(
    ref(storage, `${profilePhotoFolder(user.uid)}avatar`),
    file,
    {
      contentType: file.type,
    },
  );
}
