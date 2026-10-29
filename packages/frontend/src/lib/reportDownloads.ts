import { queryOptions } from "@tanstack/react-query";
import { getDownloadURL, ref } from "firebase/storage";
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
