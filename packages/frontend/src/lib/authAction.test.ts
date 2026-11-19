import { describe, expect, it } from "vitest";
import { parseActionSearch } from "@frontend/lib/authAction.ts";

describe("parseActionSearch", () => {
  it("keeps the mode and code from a Firebase link and drops the rest", () => {
    expect(
      parseActionSearch({
        mode: "resetPassword",
        oobCode: "abc123",
        apiKey: "key",
        continueUrl: "https://example.com",
        lang: "en",
      }),
    ).toEqual({ mode: "resetPassword", oobCode: "abc123" });
  });

  it("drops modes the page doesn't handle", () => {
    expect(
      parseActionSearch({ mode: "recoverEmail", oobCode: "abc123" }).mode,
    ).toBeUndefined();
  });

  it("drops an empty or non-string code", () => {
    expect(
      parseActionSearch({ mode: "verifyEmail", oobCode: "" }).oobCode,
    ).toBeUndefined();
    expect(
      parseActionSearch({ mode: "verifyEmail", oobCode: 123 }).oobCode,
    ).toBeUndefined();
  });
});
