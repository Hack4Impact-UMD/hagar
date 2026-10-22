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
  userRegion,
  userRole,
  userStage,
} from "@common/user.ts";
import type { UserRegion } from "@common/user.ts";

const details = {
  photoPath: "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
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

describe("user schemas", () => {
  it("limits region, role, and stage to their unions", () => {
    expect(userRegion("New Zealand")).toBe("New Zealand");
    expect(userRegion("UK")).toBeInstanceOf(type.errors);
    expect(userRole("Global Admin")).toBe("Global Admin");
    expect(userRole("Owner")).toBeInstanceOf(type.errors);
    expect(userStage("EMAIL VERIFICATION")).toBe("EMAIL VERIFICATION");
    expect(userStage("DISABLED")).toBeInstanceOf(type.errors);
  });

  it("allows null details during profile setup", () => {
    expect(storedUserProfile(settingUp)).toEqual(settingUp);
  });

  it("requires an email", () => {
    const withoutEmail: Record<string, unknown> = { ...settingUp };
    delete withoutEmail.email;
    expect(storedUserProfile(withoutEmail)).toBeInstanceOf(type.errors);
    expect(storedUserProfile({ ...settingUp, email: null })).toBeInstanceOf(
      type.errors,
    );
  });

  it("requires every detail once past profile setup", () => {
    for (const stage of ["EMAIL VERIFICATION", "AWAITING APPROVAL", "ACTIVE"]) {
      const complete = { ...settingUp, ...details, stage };
      expect(storedUserProfile(complete)).toEqual(complete);
      expect(storedUserProfile({ ...settingUp, stage })).toBeInstanceOf(
        type.errors,
      );
    }
    expect(
      storedUserProfile({
        ...settingUp,
        ...details,
        stage: "ACTIVE",
        firstName: "",
      }),
    ).toBeInstanceOf(type.errors);
  });

  it("accepts only complete details from the setup form", () => {
    expect(completeProfileInput(details)).toEqual(details);
    expect(
      completeProfileInput({
        ...details,
        photoPath: "https://example.com/me.png",
      }),
    ).toBeInstanceOf(type.errors);
    expect(completeProfileInput({ ...details, region: null })).toBeInstanceOf(
      type.errors,
    );
  });

  it("rejects undeclared keys on the setup form", () => {
    expect(
      completeProfileInput({ ...details, role: "Global Admin" }),
    ).toBeInstanceOf(type.errors);
    expect(
      completeProfileInput({ ...details, stage: "ACTIVE" }),
    ).toBeInstanceOf(type.errors);
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

describe("profile page schema", () => {
  it("accepts any subset of the editable details", () => {
    expect(updateProfileInput({})).toEqual({});
    expect(updateProfileInput({ firstName: "Grace" })).toEqual({
      firstName: "Grace",
    });
    const editable = {
      photoPath: details.photoPath,
      phoneNumber: details.phoneNumber,
      firstName: details.firstName,
      lastName: details.lastName,
    };
    expect(updateProfileInput(editable)).toEqual(editable);
  });

  it("keeps the details' rules on the fields it accepts", () => {
    expect(updateProfileInput({ firstName: "" })).toBeInstanceOf(type.errors);
    expect(updateProfileInput({ firstName: "   " })).toBeInstanceOf(
      type.errors,
    );
    expect(updateProfileInput({ photoPath: "not a path" })).toBeInstanceOf(
      type.errors,
    );
    expect(updateProfileInput({ lastName: null })).toBeInstanceOf(type.errors);
  });

  it("rejects fields the user may not change themselves", () => {
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
});

describe("user management schemas", () => {
  it("lists only users who have finished onboarding", () => {
    expect(listUsersInput({ stage: "AWAITING APPROVAL" })).toEqual({
      stage: "AWAITING APPROVAL",
    });
    expect(listUsersInput({ stage: "ACTIVE", region: "US" })).toEqual({
      stage: "ACTIVE",
      region: "US",
    });
    for (const stage of ["PROFILE SETUP", "EMAIL VERIFICATION"]) {
      expect(listUsersInput({ stage })).toBeInstanceOf(type.errors);
    }
    expect(listUsersInput({})).toBeInstanceOf(type.errors);
  });

  it("requires a plausible uid", () => {
    expect(deleteUserInput({ uid: "abc" })).toEqual({ uid: "abc" });
    expect(deleteUserInput({ uid: "" })).toBeInstanceOf(type.errors);
    expect(deleteUserInput({ uid: "a".repeat(129) })).toBeInstanceOf(
      type.errors,
    );
  });

  it("validates roles and regions", () => {
    expect(approveUserInput({ uid: "abc" })).toEqual({ uid: "abc" });
    expect(approveUserInput({ uid: "abc", role: "Owner" })).toBeInstanceOf(
      type.errors,
    );
    expect(setUserRoleInput({ uid: "abc" })).toBeInstanceOf(type.errors);
    expect(setUserRegionInput({ uid: "abc", region: "UK" })).toBeInstanceOf(
      type.errors,
    );
  });

  it("rejects undeclared keys", () => {
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

  it("treats only Global and Local Admins as admins", () => {
    expect(isAdminRole("Global Admin")).toBe(true);
    expect(isAdminRole("Local Admin")).toBe(true);
    expect(isAdminRole("Viewer")).toBe(false);
  });
});
