import { describe, expect, it } from "vitest";
import { isValidNewPassword, MIN_PASSWORD_LENGTH } from "@common/password.ts";

describe("isValidNewPassword", () => {
  it("requires the minimum length", () => {
    expect(isValidNewPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
    expect(isValidNewPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isValidNewPassword("")).toBe(false);
  });
});
