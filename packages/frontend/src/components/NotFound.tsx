import { Link } from "@tanstack/react-router";

/** Shown for any URL with no page. */
export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm">404</p>
      <h1 data-testid="not-found" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
