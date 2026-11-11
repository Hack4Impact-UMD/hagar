import { EnvelopeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef } from "react";
import {
  NOTICE_BUTTON,
  NOTICE_TEXT,
  NoticeLayout,
} from "@frontend/components/auth/NoticeLayout.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  RESEND_COOLDOWN_SECONDS,
  useCooldown,
} from "@frontend/hooks/use-cooldown.ts";
import { auth } from "@frontend/lib/firebase.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
});

const POLL_MS = 3000;

function VerifyEmail() {
  const { user } = useAuth();
  const router = useRouter();

  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const send = useMutation({
    mutationFn: async () => {
      if (!auth.currentUser) throw new Error("Sign in again to continue.");
      await sendEmailVerification(auth.currentUser);
    },
    // A failed send doesn't start the cooldown, so the user can retry right away.
    onSuccess: () => cooldown.start(),
  });

  // StrictMode mounts effects twice in development. The ref survives that,
  // so arriving on the page sends exactly one email.
  const sentOnArrival = useRef(false);
  const { mutate: sendEmail } = send;
  useEffect(() => {
    if (sentOnArrival.current) return;
    sentOnArrival.current = true;
    sendEmail();
  }, [sendEmail]);

  // The link is opened outside this tab, so nothing tells the app when it is
  // clicked. Poll the user record until Firebase reports the email verified.
  useEffect(() => {
    let checking = false;

    async function check() {
      const current = auth.currentUser;
      if (checking || !current) return;
      checking = true;
      try {
        await current.reload();
        if (!current.emailVerified) return;
        // `me` advances the stage based on the ID token, and the cached
        // token predates the click.
        await current.getIdToken(true);
        await queryClient.query({ ...trpc.me.queryOptions(), staleTime: 0 });
        await router.invalidate();
      } catch {
        // Retried on the next tick.
      } finally {
        checking = false;
      }
    }

    const id = setInterval(() => void check(), POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <NoticeLayout icon={EnvelopeIcon} title="Verify your email address">
      <p data-testid="verify-email-status" className={NOTICE_TEXT}>
        {send.isSuccess ? (
          <>
            We sent a verification link to{" "}
            <span className="font-semibold">{user?.email ?? "your email"}</span>
            . Open it to continue. If you don’t see it, you may need to check
            your spam folder.
          </>
        ) : (
          "Sending a verification link..."
        )}
      </p>
      <Button
        type="button"
        data-testid="resend-verification"
        disabled={send.isPending || cooldown.secondsLeft > 0}
        onClick={() => send.mutate()}
        className={NOTICE_BUTTON}
      >
        {cooldown.secondsLeft > 0
          ? `Resend in ${cooldown.secondsLeft}s`
          : "Resend verification email"}
      </Button>
      {send.error ? <p role="alert">{send.error.message}</p> : null}
      <Button
        type="button"
        variant="link"
        data-testid="sign-out"
        onClick={() => void auth.signOut()}
      >
        Sign out
      </Button>
    </NoticeLayout>
  );
}
