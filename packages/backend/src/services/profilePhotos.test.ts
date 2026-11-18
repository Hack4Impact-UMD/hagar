import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertOwnProfilePhoto,
  deleteProfilePhotos,
} from "@backend/services/profilePhotos.ts";

const bucket = vi.hoisted(() => ({
  deleteFiles: vi.fn<(options: object) => Promise<void>>(),
}));
vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({ bucket: () => ({ deleteFiles: bucket.deleteFiles }) }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const path = "profile-photos/user-1/avatar";

describe("assertOwnProfilePhoto", () => {
  it("accepts a photo in the caller's folder", () => {
    expect(() => assertOwnProfilePhoto("user-1", path)).not.toThrow();
  });

  it("refuses someone else's photo", () => {
    expect(() => assertOwnProfilePhoto("user-2", path)).toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });

  it("refuses another file in the caller's folder", () => {
    expect(() =>
      assertOwnProfilePhoto("user-1", "profile-photos/user-1/other"),
    ).toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
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
