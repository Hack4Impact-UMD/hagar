import { describe, expect, it, vi } from "vitest";
import { saveProfileEdits } from "@frontend/lib/saveProfile.ts";

const photo = new File(["x"], "me.png", { type: "image/png" });

function setup() {
  const calls: string[] = [];
  const saveChanges = vi.fn<(changes: object) => Promise<void>>();
  saveChanges.mockImplementation(() => {
    calls.push("text");
    return Promise.resolve();
  });
  const savePhoto = vi.fn<(photo: File) => Promise<void>>();
  savePhoto.mockImplementation(() => {
    calls.push("photo");
    return Promise.resolve();
  });
  return { calls, saveChanges, savePhoto };
}

describe("saveProfileEdits", () => {
  it("saves the text before the photo", async () => {
    const { calls, saveChanges, savePhoto } = setup();

    await saveProfileEdits({
      changes: { firstName: "Grace" },
      photo,
      saveChanges,
      savePhoto,
    });

    expect(calls).toEqual(["text", "photo"]);
    expect(saveChanges).toHaveBeenCalledWith({ firstName: "Grace" });
    expect(savePhoto).toHaveBeenCalledWith(photo);
  });

  it("leaves the photo alone when the text fails to save", async () => {
    const { saveChanges, savePhoto } = setup();
    saveChanges.mockRejectedValue(new Error("offline"));

    await expect(
      saveProfileEdits({
        changes: { firstName: "Grace" },
        photo,
        saveChanges,
        savePhoto,
      }),
    ).rejects.toThrow("offline");

    expect(savePhoto).not.toHaveBeenCalled();
  });

  it("only sends the photo when the text is unchanged", async () => {
    const { calls, saveChanges, savePhoto } = setup();

    await saveProfileEdits({ changes: {}, photo, saveChanges, savePhoto });

    expect(calls).toEqual(["photo"]);
  });

  it("only sends the text when there is no photo", async () => {
    const { calls, saveChanges, savePhoto } = setup();

    await saveProfileEdits({
      changes: { phoneNumber: "+15555550100" },
      photo: null,
      saveChanges,
      savePhoto,
    });

    expect(calls).toEqual(["text"]);
  });

  it("can be retried with only the photo after the upload failed", async () => {
    const { saveChanges, savePhoto } = setup();
    savePhoto.mockRejectedValueOnce(new Error("offline"));

    await expect(
      saveProfileEdits({
        changes: { firstName: "Grace" },
        photo,
        saveChanges,
        savePhoto,
      }),
    ).rejects.toThrow("offline");

    // The page's saved profile now matches the form, so nothing is left to
    // change on the second try.
    await saveProfileEdits({ changes: {}, photo, saveChanges, savePhoto });

    expect(saveChanges).toHaveBeenCalledTimes(1);
    expect(savePhoto).toHaveBeenCalledTimes(2);
  });
});
