import { describe, expect, it } from "vitest";
import { canAssignRole, canManage } from "@common/permissions.ts";

const globalAdmin = {
  uid: "global",
  role: "Global Admin",
  region: "US",
} as const;
const localAdmin = { uid: "local", role: "Local Admin", region: "US" } as const;
const viewer = { uid: "viewer", role: "Viewer", region: "US" } as const;

describe("canManage", () => {
  it("lets a Global Admin manage anyone in any region", () => {
    for (const role of ["Global Admin", "Local Admin", "Viewer"] as const) {
      expect(
        canManage(globalAdmin, { uid: "other", role, region: "Canada" }),
      ).toBe(true);
    }
    expect(
      canManage(globalAdmin, { uid: "other", role: "Viewer", region: null }),
    ).toBe(true);
  });

  it("limits a Local Admin to non-Global Admins in their own region", () => {
    expect(
      canManage(localAdmin, { uid: "other", role: "Viewer", region: "US" }),
    ).toBe(true);
    expect(
      canManage(localAdmin, {
        uid: "other",
        role: "Local Admin",
        region: "US",
      }),
    ).toBe(true);
    expect(
      canManage(localAdmin, {
        uid: "other",
        role: "Global Admin",
        region: "US",
      }),
    ).toBe(false);
    expect(
      canManage(localAdmin, { uid: "other", role: "Viewer", region: "Canada" }),
    ).toBe(false);
    expect(
      canManage(localAdmin, { uid: "other", role: "Viewer", region: null }),
    ).toBe(false);
  });

  it("never lets a Viewer manage anyone", () => {
    expect(
      canManage(viewer, { uid: "other", role: "Viewer", region: "US" }),
    ).toBe(false);
  });

  it("never lets an admin manage themselves", () => {
    expect(canManage(globalAdmin, globalAdmin)).toBe(false);
    expect(canManage(localAdmin, localAdmin)).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("lets a Global Admin assign every role", () => {
    for (const role of ["Global Admin", "Local Admin", "Viewer"] as const) {
      expect(canAssignRole(globalAdmin, role)).toBe(true);
    }
  });

  it("lets a Local Admin assign roles up to their own", () => {
    expect(canAssignRole(localAdmin, "Viewer")).toBe(true);
    expect(canAssignRole(localAdmin, "Local Admin")).toBe(true);
    expect(canAssignRole(localAdmin, "Global Admin")).toBe(false);
  });

  it("never lets a Viewer assign a role", () => {
    expect(canAssignRole(viewer, "Viewer")).toBe(false);
  });
});
