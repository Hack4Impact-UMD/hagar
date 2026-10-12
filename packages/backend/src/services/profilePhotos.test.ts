import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertOwnProfilePhoto,
  deleteProfilePhoto,
  deleteProfilePhotos,
} from "@backend/services/profilePhotos.ts";

const bucket = vi.hoisted(() => {
  const file = { delete: vi.fn<(options: object) => Promise<void>>() };
  return {
    file,
    fileAt: vi.fn<(path: string) => typeof file>(() => file),
    deleteFiles: vi.fn<(options: object) => Promise<void>>(),
  };
});
vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({ file: bucket.fileAt, deleteFiles: bucket.deleteFiles }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const path = "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png";

describe("assertOwnProfilePhoto", () => {
  it("accepts a photo in the caller's folder", () => {
    expect(() => assertOwnProfilePhoto("user-1", path)).not.toThrow();
  });

  it("refuses someone else's photo", () => {
    expect(() => assertOwnProfilePhoto("user-2", path)).toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });
});

describe("deleteProfilePhoto", () => {
  it("deletes the file, ignoring one that is already gone", async () => {
    await deleteProfilePhoto(path);

    expect(bucket.fileAt).toHaveBeenCalledWith(path);
    expect(bucket.file.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});

describe("deleteProfilePhotos", () => {
  it("deletes only the user's own folder", async () => {
    await deleteProfilePhotos("user-1");

    expect(bucket.deleteFiles).toHaveBeenCalledWith({
      prefix: "profile-photos/user-1/",
    });
  });
});
