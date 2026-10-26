import { HourglassIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@frontend/components/ui/button.tsx";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/awaiting-approval")({
  component: AwaitingApproval,
});

function AwaitingApproval() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-onboarding-canvas p-6">
      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-4 bg-card px-6 py-16 text-center sm:min-h-180">
        <div className="flex h-37.5 w-50 items-center justify-center bg-onboarding-icon-tile">
          <HourglassIcon aria-hidden size={160} className="text-primary" />
        </div>
        <h1 className="mt-8 text-[40px]/12 font-bold text-foreground">
          Your account is pending approval
        </h1>
        <p
          data-testid="awaiting-approval"
          className="mt-6 max-w-122.5 text-lg/5.5 text-foreground"
        >
          Thanks for signing up! An admin needs to approve your account and
          assign you a role before you can access Hagar.
        </p>
        <Button
          type="button"
          variant="outline"
          data-testid="sign-out"
          onClick={() => void auth.signOut()}
          className="mt-8 h-17.5 w-full max-w-82.25 rounded-[10px] border-primary bg-background text-base font-bold text-primary hover:bg-background hover:text-primary"
        >
          Log out
        </Button>
      </div>
    </main>
  );
}
