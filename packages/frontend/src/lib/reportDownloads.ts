import { queryOptions } from "@tanstack/react-query";
import { getBlob, getDownloadURL, ref } from "firebase/storage";
import { storage } from "@frontend/lib/firebase.ts";

/** Looks up the URL that opens a report's PDF, e.g. in a new tab. */
export function reportPdfUrlOptions(path: string) {
  return queryOptions({
    queryKey: ["reportPdfUrl", path],
    queryFn: () => getDownloadURL(ref(storage, path)),
    // A report's PDF never moves, so the URL for its path never changes.
    staleTime: Infinity,
  });
}

/**
 * Saves a report's PDF to the user's computer as `fileName`.
 *
 * Browsers ignore `<a download>` on cross-origin links, and Cloud Storage URLs
 * are cross-origin, so a plain link would open the PDF instead of saving it.
 * Fetching the bytes and saving them from a same-origin object URL works.
 * Fetching from the browser needs CORS set up on the Storage bucket: if this
 * fails with a network error while opening the PDF works, that is the cause.
 */
export async function downloadReport(
  path: string,
  fileName: string,
): Promise<void> {
  const blob = await getBlob(ref(storage, path));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the object URL after `click()` returns, so revoking it
  // straight away can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 40_000);
}

// Characters Windows, macOS or Linux reject in file names, plus control
// characters.
const UNSAFE_FILE_NAME_CHARS = /[\\/:*?"<>|\p{Cc}]/gu;
const MAX_NAME_LENGTH = 100;

/**
 * A file name like `Q3 Sales - 2026-10-02.pdf`, with the date in the user's
 * time zone. View names are typed in by users, so characters that aren't
 * allowed in file names are replaced, and leading or trailing dots and spaces
 * (hidden files, or names Windows rejects) are removed.
 */
export function reportFileName(viewName: string, takenAt: string): string {
  const safeName = viewName
    .replace(UNSAFE_FILE_NAME_CHARS, "_")
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/^[. ]+|[. ]+$/g, "");
  return `${safeName || "Report"} - ${localDate(takenAt)}.pdf`;
}

function localDate(utcDate: string): string {
  const date = new Date(utcDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
