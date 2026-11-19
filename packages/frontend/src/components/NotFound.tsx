import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { Button } from "@frontend/components/ui/button.tsx";

const ACTION = "h-12 rounded-lg px-6 text-base font-normal";

/**
 * Shown for any URL with no page, signed in or out. Full page rather than
 * inside the app layout, which signed-out users don't get. The guards send a
 * signed-out user from `/` on to login.
 */
export function NotFound() {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  // A 404 opened straight from outside the app (an email, a bookmark) has no
  // app page behind it, and stepping back would leave the site. Home is the
  // nearest thing to "back" then.
  function goBack() {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-center">
      <p className="text-base text-muted-foreground">Error 404</p>
      <h1
        data-testid="not-found"
        className="mt-6 text-[2.5rem]/12 font-semibold text-primary"
      >
        Page Not Found
      </h1>
      <p className="mt-8 max-w-136 text-lg/6 text-foreground">
        We couldn’t find that page. It may have been moved or deleted, or the
        link may be out of date.
      </p>
      <div className="mt-12 flex flex-wrap justify-center gap-6">
        <Button asChild className={ACTION}>
          <Link to="/">Back to Home</Link>
        </Button>
        <Button
          variant="outline"
          onClick={goBack}
          className={`${ACTION} border-field-border shadow-none`}
        >
          Go back
        </Button>
      </div>
    </main>
  );
}
