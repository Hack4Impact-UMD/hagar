import { SignpostIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
  NOTICE_BUTTON,
  NOTICE_TEXT,
  NoticeLayout,
} from "@frontend/components/auth/NoticeLayout.tsx";
import { Button } from "@frontend/components/ui/button.tsx";

/**
 * Shown for any URL with no page, signed in or out. Full page rather than
 * inside the app layout, which signed-out users don't get. The guards send a
 * signed-out user from `/` on to login.
 */
export function NotFound() {
  return (
    <NoticeLayout icon={SignpostIcon} title="Page not found">
      <p data-testid="not-found" className={NOTICE_TEXT}>
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Button asChild className={NOTICE_BUTTON}>
        <Link to="/">Back to homepage</Link>
      </Button>
    </NoticeLayout>
  );
}
