import { useCallback, useEffect, useState } from "react";

/** How long resend buttons stay disabled after an email goes out. */
export const RESEND_COOLDOWN_SECONDS = 15;

/**
 * A countdown that restarts at `seconds` each time `start` is called.
 * `secondsLeft` is 0 when no countdown is running.
 */
export function useCooldown(seconds: number) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Counts against the clock rather than decrementing once per tick, because
  // browsers slow down intervals in background tabs and a per-tick count
  // would fall behind.
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) setEndsAt(null);
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, [seconds]);

  const secondsLeft =
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  return { secondsLeft, start };
}
