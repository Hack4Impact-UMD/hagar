import { MAX_REPORT_BYTES, reportFilePath } from "@repo/common";
import type { View } from "@repo/common";
import type { jsPDF } from "jspdf";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@frontend/lib/firebase.ts";

const MARGIN = 48;
const GAP = 16;
const COLUMNS = 3;
const TITLE_SIZE = 20;
const NAME_SIZE = 12;
const MIN_NAME_SIZE = 6;

/**
 * A text PDF of the preview: the view name, then one square card per chart.
 * jsPDF and its font load only when a report is generated, so they stay off
 * the first page load. Cards stay a fixed size, matching the preview.
 */
export async function buildReportPdf(
  view: Pick<View, "name" | "charts">,
): Promise<Blob> {
  const { jsPDF: JsPdf } = await import("jspdf");
  const doc = new JsPdf({ unit: "pt", format: "letter" });
  // Helvetica cannot draw names outside Latin-1. Inter can, and jsPDF can embed this static file.
  const font = await import("@frontend/assets/Inter-Regular.ttf?inline");
  doc.addFileToVFS("Inter-Regular.ttf", fontBase64(font.default));
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");
  doc.setFont("Inter", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cardSize = (pageWidth - MARGIN * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  doc.setFontSize(TITLE_SIZE);
  const titleLines = wrap(doc, view.name, pageWidth - MARGIN * 2);
  doc.text(titleLines, MARGIN, MARGIN + TITLE_SIZE);
  let y = MARGIN + titleLines.length * doc.getLineHeight() + GAP;

  doc.setDrawColor(220);
  const inner = cardSize - GAP * 2;

  view.charts.forEach((chart, index) => {
    const column = index % COLUMNS;
    if (column === 0 && y + cardSize > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    const x = MARGIN + column * (cardSize + GAP);
    doc.rect(x, y, cardSize, cardSize);

    const lines = linesThatFit(doc, chart.name, inner, inner);
    const blockHeight = lines.length * doc.getLineHeight();
    const textY =
      blockHeight <= inner
        ? y + (cardSize - blockHeight) / 2 + doc.getFontSize()
        : y + GAP + doc.getFontSize();
    doc.text(lines, x + cardSize / 2, textY, { align: "center" });

    if (column === COLUMNS - 1) y += cardSize + GAP;
  });

  const pdf = doc.output("blob");
  if (pdf.size > MAX_REPORT_BYTES) {
    throw new Error("The report is too large.");
  }
  return pdf;
}

/** Uploads the PDF the backend will record. The file name is the report id. */
export async function uploadReportPdf(
  viewId: string,
  reportId: string,
  pdf: Blob,
): Promise<string> {
  const path = reportFilePath(viewId, reportId);
  await uploadBytes(ref(storage, path), pdf, {
    contentType: "application/pdf",
  });
  return path;
}

export function reportDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

/** `?inline` is a data URL in the app and a raw base64 string under Vitest. */
function fontBase64(font: string): string {
  const comma = font.indexOf(",");
  return comma === -1 ? font : font.slice(comma + 1);
}

function wrap(doc: jsPDF, text: string, width: number): string[] {
  const lines = doc.splitTextToSize(text, width);
  return Array.isArray(lines) ? lines : [lines];
}

/**
 * Shrink until every line of the name fits in the square. At the smallest
 * size, still return every line: the PDF has to contain the whole name.
 */
function linesThatFit(
  doc: jsPDF,
  text: string,
  width: number,
  height: number,
): string[] {
  let size = NAME_SIZE;
  while (size > MIN_NAME_SIZE) {
    doc.setFontSize(size);
    const lines = wrap(doc, text, width);
    const lineHeight = doc.getLineHeight();
    const widest = Math.max(0, ...lines.map((line) => doc.getTextWidth(line)));
    if (lines.length * lineHeight <= height && widest <= width) return lines;
    size -= 0.5;
  }
  doc.setFontSize(MIN_NAME_SIZE);
  return wrap(doc, text, width);
}
