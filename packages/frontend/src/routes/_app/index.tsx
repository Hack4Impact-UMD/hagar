import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@frontend/lib/firebase.ts";
import { pageTitle } from "@frontend/lib/pageTitle.ts";

export const Route = createFileRoute("/_app/")({
  head: () => pageTitle("Homepage"),
  component: Home,
});

function Home() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="homepage">Homepage</h1>
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
