import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  isOwnProfilePhoto,
  isProfilePhotoType,
  profilePhotoPath,
} from "@common/profilePhoto.ts";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("profilePhotoPath", () => {
  it("accepts a photo in a user's folder", () => {
    for (const extension of ["png", "jpg", "webp"]) {
      const path = `profile-photos/user-1/${uuid}.${extension}`;
      expect(profilePhotoPath(path)).toBe(path);
    }
  });

  it("rejects anything outside the profile photo layout", () => {
    for (const path of [
      "https://example.com/me.png",
      `profile-photos/${uuid}.png`,
      `profile-photos/user-1/nested/${uuid}.png`,
      `profile-photos/user-1/${uuid}.gif`,
      "profile-photos/user-1/not-a-uuid.png",
      `other/user-1/${uuid}.png`,
    ]) {
      expect(profilePhotoPath(path)).toBeInstanceOf(type.errors);
    }
  });
});

describe("isOwnProfilePhoto", () => {
  it("matches only the owner's folder", () => {
    const path = `profile-photos/user-1/${uuid}.png`;
    expect(isOwnProfilePhoto("user-1", path)).toBe(true);
    expect(isOwnProfilePhoto("user-2", path)).toBe(false);
    // A uid that is a prefix of another must not reach into its folder.
    expect(isOwnProfilePhoto("user", path)).toBe(false);
  });
});

describe("isProfilePhotoType", () => {
  it("allows PNG, JPEG and WebP only", () => {
    for (const allowed of ["image/png", "image/jpeg", "image/webp"]) {
      expect(isProfilePhotoType(allowed)).toBe(true);
    }
    for (const refused of ["image/gif", "image/svg+xml", "text/html", ""]) {
      expect(isProfilePhotoType(refused)).toBe(false);
    }
  });
});
