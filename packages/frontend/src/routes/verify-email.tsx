import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef } from "react";
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

  const send = useMutation({
    mutationFn: async () => {
      if (!auth.currentUser) throw new Error("Sign in again to continue.");
      await sendEmailVerification(auth.currentUser);
    },
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
    <main className="flex flex-col gap-4 p-6">
      <h1>Verify email</h1>
      <p data-testid="verify-email-status">
        {send.isSuccess
          ? `We sent a verification link to ${user?.email ?? "your email"}. Open it to continue.`
          : "Sending a verification link..."}
      </p>
      <button
        type="button"
        data-testid="resend-verification"
        disabled={send.isPending}
        onClick={() => send.mutate()}
        className="self-start border px-3 py-1"
      >
        Resend verification email
      </button>
      {send.error ? <p role="alert">{send.error.message}</p> : null}
      <button
        type="button"
        data-testid="sign-out"
        onClick={() => void auth.signOut()}
        className="self-start border px-3 py-1"
      >
        Sign out
      </button>
    </main>
  );
}
