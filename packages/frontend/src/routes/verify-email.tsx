import { EnvelopeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
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
    <main className="flex min-h-svh items-center justify-center bg-[#f9f6f1] p-6">
      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-4 bg-card px-6 py-16 text-center sm:min-h-180">
        <div className="flex h-37.5 w-50 items-center justify-center bg-[#f1ded2]">
          <EnvelopeIcon aria-hidden size={160} className="text-white" />
        </div>
        <h1 className="mt-8 text-[40px]/12 font-bold text-[#1c1917]">
          Verify your email address
        </h1>
        <p
          data-testid="verify-email-status"
          className="mt-6 max-w-122.5 text-base/5 text-[#1c1917]"
        >
          {send.isSuccess ? (
            <>
              We sent a verification link to{" "}
              <span className="font-semibold">
                {user?.email ?? "your email"}
              </span>
              . Open it to continue. If you don’t see it, you may need to
              check your spam folder.
            </>
          ) : (
            "Sending a verification link..."
          )}
        </p>
        <Button
          type="button"
          data-testid="resend-verification"
          disabled={send.isPending}
          onClick={() => send.mutate()}
          className="mt-8 h-17.5 w-full max-w-82.25 rounded-[10px] text-base font-semibold"
        >
          Resend verification email
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
      </div>
    </main>
  );
}
