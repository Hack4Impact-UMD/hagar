import { describe, expect, it } from "vitest";
import {
  assertCanAssignRole,
  assertCanManage,
} from "@backend/services/permissions.ts";

const localAdmin = { uid: "local", role: "Local Admin", region: "US" } as const;

describe("assertCanManage", () => {
  it("throws FORBIDDEN when management is not allowed", () => {
    expect(() => assertCanManage(localAdmin, localAdmin)).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

describe("assertCanAssignRole", () => {
  it("throws FORBIDDEN when the role is out of reach", () => {
    expect(() => assertCanAssignRole(localAdmin, "Global Admin")).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});
