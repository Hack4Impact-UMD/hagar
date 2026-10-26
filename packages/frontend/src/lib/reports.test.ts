import { describe, expect, it } from "vitest";
import { buildReportPdf } from "@frontend/lib/reports.ts";

const longName =
  "Regional fundraising progress for every program, chapter, and partner organization";

describe("buildReportPdf", () => {
  it("writes each full name, including characters outside Latin-1", async () => {
    const pdf = await buildReportPdf({
      name: "Executive Overview",
      charts: [
        { name: "Donations Š" },
        { name: longName },
        { name: "Volunteers" },
      ],
    });

    expect(pdf.type).toBe("application/pdf");
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-");
    const text = await pdfText(pdf);
    const compact = text.replaceAll(/\s+/g, "");
    expect(compact).toContain("ExecutiveOverview");
    expect(compact).toContain("DonationsŠ");
    expect(compact).toContain(longName.replaceAll(/\s+/g, ""));
    expect(compact).toContain("Volunteers");
  });
});

/** Custom fonts store glyph ids. The ToUnicode map is what puts the names back together. */
async function pdfText(pdf: Blob): Promise<string> {
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  const source = await inflateStreams(bytes);
  const glyphToChar = cmap(source);
  let text = "";
  for (const hex of source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
    const raw = hex[1] ?? "";
    for (let i = 0; i < raw.length; i += 4) {
      text += glyphToChar.get(raw.slice(i, i + 4).toLowerCase()) ?? "";
    }
  }
  return text;
}

function cmap(source: string): Map<string, string> {
  const glyphToChar = new Map<string, string>();
  for (const block of source.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of (block[1] ?? "").matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      const glyph = pair[1];
      const code = pair[2];
      if (glyph === undefined || code === undefined) continue;
      glyphToChar.set(
        glyph.toLowerCase(),
        String.fromCodePoint(Number.parseInt(code, 16)),
      );
    }
  }
  for (const block of source.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of (block[1] ?? "").matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      const startHex = range[1];
      const endHex = range[2];
      const destHex = range[3];
      if (
        startHex === undefined ||
        endHex === undefined ||
        destHex === undefined
      ) {
        continue;
      }
      const start = Number.parseInt(startHex, 16);
      const end = Number.parseInt(endHex, 16);
      const dest = Number.parseInt(destHex, 16);
      for (let offset = 0; offset <= end - start; offset += 1) {
        glyphToChar.set(
          (start + offset).toString(16).padStart(4, "0"),
          String.fromCodePoint(dest + offset),
        );
      }
    }
  }
  return glyphToChar;
}

async function inflateStreams(bytes: Uint8Array): Promise<string> {
  const latin = new TextDecoder("latin1").decode(bytes);
  const parts = latin.split(/stream\r?\n/);
  let decoded = latin;
  for (const part of parts.slice(1)) {
    const end = part.indexOf("endstream");
    if (end < 0) continue;
    const raw = part.slice(0, end).replace(/\r?\n$/, "");
    const chunk = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    try {
      const stream = new Blob([chunk])
        .stream()
        .pipeThrough(new DecompressionStream("deflate"));
      decoded += new TextDecoder("latin1").decode(
        new Uint8Array(await new Response(stream).arrayBuffer()),
      );
    } catch {
      decoded += raw;
    }
  }
  return decoded;
}
