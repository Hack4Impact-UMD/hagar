import { type } from "arktype";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  completeProfileInput,
  storedUserProfile,
  userRegion,
  userRole,
  userStage,
} from "@common/user.ts";
import type { UserRegion } from "@common/user.ts";

const details = {
  photoUrl: "https://example.com/me.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US",
};

const settingUp = {
  stage: "PROFILE SETUP",
  photoUrl: null,
  phoneNumber: null,
  firstName: null,
  lastName: null,
  region: null,
  role: "Viewer",
  createdAt: 1,
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
      completeProfileInput({ ...details, photoUrl: "not a url" }),
    ).toBeInstanceOf(type.errors);
    expect(completeProfileInput({ ...details, region: null })).toBeInstanceOf(
      type.errors,
    );
  });

  it("caps the length of every free-text detail", () => {
    const urlOfLength = (length: number) => {
      const prefix = "https://example.com/";
      return prefix + "a".repeat(length - prefix.length);
    };
    const caps = [
      ["photoUrl", 4096, urlOfLength],
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
