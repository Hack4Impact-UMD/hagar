import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/awaiting-approval")({
  component: AwaitingApproval,
});

function AwaitingApproval() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Awaiting approval</h1>
      <p data-testid="awaiting-approval">
        Waiting for admin approval. Come back later once the admin approves you!
      </p>
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
