import { LinkBreakIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import type { ReactNode } from "react";
import { useState } from "react";
import { AuthLayout } from "@frontend/components/auth/AuthLayout.tsx";
import {
  NOTICE_BUTTON,
  NOTICE_TEXT,
  NoticeLayout,
} from "@frontend/components/auth/NoticeLayout.tsx";
import { FormField } from "@frontend/components/form/FormField.tsx";
import { SubmitButton } from "@frontend/components/form/SubmitButton.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { parseActionSearch } from "@frontend/lib/authAction.ts";
import { authErrorMessage } from "@frontend/lib/authErrors.ts";
import { auth } from "@frontend/lib/firebase.ts";

/**
 * Where every link in Firebase's emails lands (reset password and verify
 * email alike), since Firebase has one action URL setting for all of them.
 */
export const Route = createFileRoute("/auth-action")({
  validateSearch: parseActionSearch,
  component: AuthAction,
});

function AuthAction() {
  const { mode, oobCode } = Route.useSearch();
  if (!oobCode) return <InvalidLink />;

  switch (mode) {
    case "resetPassword":
      return <ResetPassword oobCode={oobCode} />;
    default:
      return <InvalidLink />;
  }
}

function ResetPassword({ oobCode }: { oobCode: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  // Checking the code doesn't use it up, so this is safe to rerun. It also
  // returns the account's email, which tells the user whose password this is.
  const account = useQuery({
    queryKey: ["verifyPasswordResetCode", oobCode],
    queryFn: () => verifyPasswordResetCode(auth, oobCode),
    retry: false,
    staleTime: Infinity,
  });

  const reset = useMutation({
    mutationFn: () => confirmPasswordReset(auth, oobCode, password),
    // The login page picks its message from the flag. Passing the text itself
    // in the URL would let anyone's link put their words on our page.
    onSuccess: () => navigate({ to: "/login", search: { reset: 1 } }),
  });
  // Stays busy through the navigation so the form doesn't flash back to idle.
  const busy = account.isPending || reset.isPending || reset.isSuccess;

  if (account.isError) {
    return (
      <ExpiredLink
        error={account.error}
        hint="Request a new link to reset your password."
        action={<Link to="/forgot-password">Get a new link</Link>}
      />
    );
  }

  return (
    <AuthLayout
      title="Reset password"
      prompt={
        account.data ? (
          <>
            Reset the password for{" "}
            <span data-testid="reset-account" className="font-semibold">
              {account.data}
            </span>
            .
          </>
        ) : (
          "Checking your link..."
        )
      }
      onSubmit={() => reset.mutate()}
      error={reset.error ? authErrorMessage(reset.error) : undefined}
    >
      <FormField
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        disabled={busy}
        data-testid="new-password"
        onChange={(event) => setPassword(event.target.value)}
      />
      <p className="flex justify-start pb-7.5 text-chart-3">
        At least 8 characters
      </p>
      <SubmitButton pending={busy} data-testid="reset-password">
        Reset password
      </SubmitButton>
    </AuthLayout>
  );
}

/** For a link Firebase rejected, usually because it expired or was used. */
function ExpiredLink({
  error,
  hint,
  action,
}: {
  error: unknown;
  hint: string;
  action: ReactNode;
}) {
  return (
    <NoticeLayout icon={LinkBreakIcon} title="This link can’t be used">
      <p data-testid="expired-link" className={NOTICE_TEXT}>
        {authErrorMessage(error)} {hint}
      </p>
      <Button asChild className={NOTICE_BUTTON}>
        {action}
      </Button>
    </NoticeLayout>
  );
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
