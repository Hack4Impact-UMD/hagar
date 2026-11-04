import { type } from "arktype";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  approveUserInput,
  completeProfileInput,
  deleteUserInput,
  isAdminRole,
  listUsersInput,
  setUserRegionInput,
  setUserRoleInput,
  storedUserProfile,
  updateProfileInput,
  userInfoInput,
} from "@common/user.ts";
import type { UserRegion } from "@common/user.ts";

const details = {
  photoPath: "profile-photos/user-1/avatar",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US",
};

const settingUp = {
  email: "ada@example.com",
  stage: "PROFILE SETUP",
  photoPath: null,
  phoneNumber: null,
  firstName: null,
  lastName: null,
  region: null,
  role: "Viewer",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("stored user profile", () => {
  it("allows null details during profile setup", () => {
    expect(storedUserProfile(settingUp)).toEqual(settingUp);
  });

  it("requires every detail once past profile setup", () => {
    for (const stage of ["EMAIL VERIFICATION", "AWAITING APPROVAL", "ACTIVE"]) {
      const complete = { ...settingUp, ...details, stage };
      expect(storedUserProfile(complete)).toEqual(complete);
      expect(storedUserProfile({ ...settingUp, stage })).toBeInstanceOf(
        type.errors,
      );
    }
  });

  it("caps the length of every free-text detail", () => {
    const caps = [
      ["phoneNumber", 100, (length: number) => "1".repeat(length)],
      ["firstName", 500, (length: number) => "a".repeat(length)],
      ["lastName", 500, (length: number) => "a".repeat(length)],
    ] as const;

    for (const [field, max, valueOfLength] of caps) {
      const atCap = { ...details, [field]: valueOfLength(max) };
      const overCap = { ...details, [field]: valueOfLength(max + 1) };
      expect(completeProfileInput(atCap)).toEqual(atCap);
      expect(completeProfileInput(overCap)).toBeInstanceOf(type.errors);
      // The caps also hold while the rest of the profile is still empty.
      expect(
        storedUserProfile({ ...settingUp, [field]: valueOfLength(max + 1) }),
      ).toBeInstanceOf(type.errors);
    }
  });

  it("narrows details to non-null past profile setup", () => {
    const profile = storedUserProfile.assert({
      ...settingUp,
      ...details,
      stage: "AWAITING APPROVAL",
    });
    if (profile.stage === "PROFILE SETUP") {
      expectTypeOf(profile.firstName).toEqualTypeOf<string | null>();
    } else {
      expectTypeOf(profile.firstName).toEqualTypeOf<string>();
      expectTypeOf(profile.region).toEqualTypeOf<UserRegion>();
    }
  });
});

describe("profile inputs", () => {
  it("reject fields the user may not set themselves", () => {
    expect(
      completeProfileInput({ ...details, role: "Global Admin" }),
    ).toBeInstanceOf(type.errors);
    expect(
      completeProfileInput({ ...details, stage: "ACTIVE" }),
    ).toBeInstanceOf(type.errors);

    for (const [field, value] of [
      ["region", "Canada"],
      ["role", "Global Admin"],
      ["stage", "ACTIVE"],
      ["email", "other@example.com"],
      ["createdAt", "2024-01-01T00:00:00.000Z"],
    ] as const) {
      expect(updateProfileInput({ [field]: value })).toBeInstanceOf(
        type.errors,
      );
    }
  });

  it("treat a whitespace-only name as empty", () => {
    expect(updateProfileInput({ firstName: "   " })).toBeInstanceOf(
      type.errors,
    );
  });
});

describe("user lookup and management inputs", () => {
  it("reject undeclared keys", () => {
    expect(userInfoInput({ uids: ["user-1"], extra: 1 })).toBeInstanceOf(
      type.errors,
    );
    const extra = { uid: "abc", stage: "ACTIVE" };
    for (const schema of [
      approveUserInput,
      deleteUserInput,
      setUserRoleInput,
      setUserRegionInput,
    ]) {
      expect(schema({ role: "Viewer", region: "US", ...extra })).toBeInstanceOf(
        type.errors,
      );
    }
    expect(listUsersInput({ stage: "ACTIVE", role: "Viewer" })).toBeInstanceOf(
      type.errors,
    );
  });

  it("list only users who have finished onboarding", () => {
    for (const stage of ["PROFILE SETUP", "EMAIL VERIFICATION"]) {
      expect(listUsersInput({ stage })).toBeInstanceOf(type.errors);
    }
  });
});

describe("isAdminRole", () => {
  it("treats only Global and Local Admins as admins", () => {
    expect(isAdminRole("Global Admin")).toBe(true);
    expect(isAdminRole("Local Admin")).toBe(true);
    expect(isAdminRole("Viewer")).toBe(false);
  });
});
