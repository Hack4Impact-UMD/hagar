/**
 * Full-page placeholder for any wait with nothing else to show: a route's
 * `beforeLoad` or loader (it's the router's `defaultPendingComponent`),
 * Firebase restoring the session, or /auth-action checking a link.
 */
export function LoadingPage() {
  return (
    <main
      // Figma sits the logo and spinner stack 1rem below true center.
      className="flex min-h-svh w-full flex-col items-center justify-center bg-white pt-8"
    >
      <img src="/logo-full.svg" alt="Hagar" className="mb-17 w-57.75" />
      <Spinner />
      <output className="mt-5.25 text-base leading-5.25 text-muted-foreground">
        Loading...
      </output>
    </main>
  );
}

/** A quarter-circle arc that spins around a static track. */
function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 56 56"
      fill="none"
      strokeWidth={5}
      className="size-14"
    >
      <circle cx={28} cy={28} r={23} className="stroke-onboarding-icon-tile" />
      {/* Top to right quadrant of the track. Rotating around the viewBox
          center keeps the arc on the track. */}
      <path
        d="M28 5A23 23 0 0 1 51 28"
        className="origin-center animate-spin stroke-primary"
      />
    </svg>
  );
}
