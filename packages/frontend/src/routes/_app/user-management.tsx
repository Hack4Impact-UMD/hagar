import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagement,
});

function UserManagement() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="user-management">User management</h1>
      <p>Placeholder for approving and managing users.</p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
