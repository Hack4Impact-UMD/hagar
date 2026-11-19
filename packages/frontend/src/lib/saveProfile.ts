import type { UpdateProfileInput } from "@repo/common";

/**
 * Saves what the user edited on the profile page: the text fields, then the
 * photo.
 *
 * The photo goes last because uploading overwrites the live photo at once. If
 * it went first, a failed text save followed by Cancel would leave the new
 * photo showing even though the edit was abandoned. In this order a retry
 * after a failed upload only has the photo left to send.
 */
export async function saveProfileEdits(edits: {
  changes: UpdateProfileInput;
  photo: File | null;
  saveChanges: (changes: UpdateProfileInput) => Promise<unknown>;
  savePhoto: (photo: File) => Promise<unknown>;
}): Promise<void> {
  if (Object.keys(edits.changes).length > 0) {
    await edits.saveChanges(edits.changes);
  }
  if (edits.photo) await edits.savePhoto(edits.photo);
}
