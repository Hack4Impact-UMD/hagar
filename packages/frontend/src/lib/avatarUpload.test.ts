import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadBytes = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const currentUser = { uid: "user-1" } as { uid: string } | null;
const authState = { currentUser };

vi.mock("firebase/storage", () => ({
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytes: (...args: unknown[]) => uploadBytes(...args),
  getDownloadURL: vi.fn<() => void>(),
}));
vi.mock("@frontend/lib/firebase.ts", () => ({
  auth: authState,
  storage: {},
}));

const { uploadAvatar } = await import("@frontend/lib/avatarUpload.ts");

const png = new File(["x"], "me.png", { type: "image/png" });

beforeEach(() => {
  uploadBytes.mockReset();
  uploadBytes.mockResolvedValue(null);
  authState.currentUser = { uid: "user-1" };
});

describe("uploadAvatar", () => {
  it("overwrites the fixed path in the user's folder", async () => {
    await uploadAvatar(png);

    expect(uploadBytes).toHaveBeenCalledWith(
      { path: "profile-photos/user-1/avatar" },
      png,
      { contentType: "image/png" },
    );
  });

  it("refuses a file that can't be a profile photo", async () => {
    const gif = new File(["x"], "me.gif", { type: "image/gif" });

    await expect(uploadAvatar(gif)).rejects.toThrow("PNG, JPEG, or WebP");
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it("refuses to upload when signed out", async () => {
    authState.currentUser = null;

    await expect(uploadAvatar(png)).rejects.toThrow("Sign in");
    expect(uploadBytes).not.toHaveBeenCalled();
  });
});
