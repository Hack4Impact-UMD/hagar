import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_FILENAME_LENGTH,
  reportFileName,
} from "@frontend/lib/reportDownloads.ts";

// The file name needs no Firebase, so the app's Firebase setup is left out.
vi.mock("@frontend/lib/firebase.ts", () => ({ storage: {} }));

const TAKEN_AT = "2026-10-02T14:10:00.000Z";

/** The file name for `viewPart`, dated as the user's own clock shows TAKEN_AT. */
function named(viewPart: string) {
  return `${viewPart} - ${new Date(TAKEN_AT).toLocaleDateString("en-CA")}.pdf`;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reportFileName", () => {
  it("names the file after the view and the day in the user's time zone", () => {
    expect(reportFileName("Q3 Sales", TAKEN_AT)).toBe(named("Q3 Sales"));

    vi.stubEnv("TZ", "America/New_York");
    // 2am UTC on the 3rd is still the evening of the 2nd in New York.
    expect(reportFileName("Q3", "2026-10-03T02:00:00.000Z")).toBe(
      "Q3 - 2026-10-02.pdf",
    );
  });

  it("replaces characters that aren't allowed and collapses whitespace", () => {
    expect(reportFileName('a\\b/c:d*e?f"g<h>i|j\u0007k', TAKEN_AT)).toBe(
      named("a_b_c_d_e_f_g_h_i_j_k"),
    );
    // Tabs and new lines are control characters, but become spaces.
    expect(reportFileName("Q3 \t\n Sales", TAKEN_AT)).toBe(named("Q3 Sales"));
  });

  it('trims dots and spaces from the ends, falling back to "Report"', () => {
    expect(reportFileName(" ..Q3 Sales.. ", TAKEN_AT)).toBe(named("Q3 Sales"));
    for (const viewName of ["", "   ", "..."]) {
      expect(reportFileName(viewName, TAKEN_AT)).toBe(named("Report"));
    }
  });

  it("shortens a long view name", () => {
    expect(reportFileName("x".repeat(300), TAKEN_AT)).toBe(
      named("x".repeat(MAX_FILENAME_LENGTH)),
    );
  });
});
