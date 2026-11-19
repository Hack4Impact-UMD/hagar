import { describe, expect, it } from "vitest";
import { buildReportPdf } from "@frontend/lib/reports.ts";

const chart = (name: string) => ({
  name,
  chartId: "EMAIL_LIST_SIZE" as const,
  params: {
    emailListId: "list-1",
    pointInTime: { type: "STATIC" as const, date: "2025-01-01" },
  },
});

const longName =
  "Regional fundraising progress for every program, chapter, and partner organization";

describe("buildReportPdf", () => {
  it("writes each full name, including accented characters", async () => {
    const pdf = await buildReportPdf({
      name: "Executive Overview",
      charts: [chart("Donations É"), chart(longName), chart("Volunteers")],
    });

    expect(pdf.type).toBe("application/pdf");
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-");
    const text = await pdfText(pdf);
    const compact = text.replaceAll(/\s+/g, "");
    expect(compact).toContain("ExecutiveOverview");
    expect(compact).toContain("DonationsÉ");
    expect(compact).toContain(longName.replaceAll(/\s+/g, ""));
    expect(compact).toContain("Volunteers");
  });
});

/** The text of every `(…) Tj` operator, in drawing order. */
async function pdfText(pdf: Blob): Promise<string> {
  const source = new TextDecoder("latin1").decode(await pdf.arrayBuffer());
  let text = "";
  for (const match of source.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    text += match[1] ?? "";
  }
  return text;
}
