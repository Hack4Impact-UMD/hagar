import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="profile">Profile</h1>
      <p>Placeholder for viewing and editing your profile.</p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
