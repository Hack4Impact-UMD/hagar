import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  isOwnProfilePhoto,
  isProfilePhotoType,
  ownProfilePhotoPath,
  profilePhotoPath,
} from "@common/profilePhoto.ts";

describe("profilePhotoPath", () => {
  it("accepts a user's avatar", () => {
    const path = "profile-photos/user-1/avatar";
    expect(profilePhotoPath(path)).toBe(path);
  });

  it("rejects anything outside the profile photo layout", () => {
    for (const path of [
      "https://example.com/me.png",
      "profile-photos/avatar",
      "profile-photos/user-1/nested/avatar",
      "profile-photos/user-1/avatar.png",
      "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
      "other/user-1/avatar",
    ]) {
      expect(profilePhotoPath(path)).toBeInstanceOf(type.errors);
    }
  });
});

describe("isOwnProfilePhoto", () => {
  it("matches only the owner's avatar", () => {
    const path = ownProfilePhotoPath("user-1");
    expect(path).toBe("profile-photos/user-1/avatar");
    expect(isOwnProfilePhoto("user-1", path)).toBe(true);
    expect(isOwnProfilePhoto("user-2", path)).toBe(false);
    // A uid that is a prefix of another must not reach into its folder.
    expect(isOwnProfilePhoto("user", path)).toBe(false);
    expect(isOwnProfilePhoto("user-1", "profile-photos/user-1/other")).toBe(
      false,
    );
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
