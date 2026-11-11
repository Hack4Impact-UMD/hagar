import { LinkBreakIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  NOTICE_BUTTON,
  NOTICE_TEXT,
  NoticeLayout,
} from "@frontend/components/auth/NoticeLayout.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { parseActionSearch } from "@frontend/lib/authAction.ts";

/**
 * Where every link in Firebase's emails lands (reset password and verify
 * email alike), since Firebase has one action URL setting for all of them.
 */
export const Route = createFileRoute("/auth-action")({
  validateSearch: parseActionSearch,
  component: AuthAction,
});

function AuthAction() {
  return <InvalidLink />;
}

/** For a URL that isn't a usable email link, like a bare /auth-action. */
function InvalidLink() {
  return (
    <NoticeLayout icon={LinkBreakIcon} title="This link isn’t valid">
      <p data-testid="invalid-link" className={NOTICE_TEXT}>
        Open the link from your email again, or log in to continue.
      </p>
      <Button asChild className={NOTICE_BUTTON}>
        <Link to="/login">Back to login</Link>
      </Button>
    </NoticeLayout>
  );
}
