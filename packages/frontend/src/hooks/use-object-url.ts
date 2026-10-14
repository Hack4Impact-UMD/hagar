import { useEffect, useState } from "react";

/**
 * A URL for previewing `file`, or `null` without one. The URL is revoked when
 * the file changes or the component unmounts, since the browser holds the
 * file in memory until then.
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
