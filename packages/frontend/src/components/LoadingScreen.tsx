/** A full-page wait, for while the app can't show anything else yet. */
export function LoadingScreen() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <img src="/logo.png" alt="Hagar" className="w-55" />
      <div
        role="status"
        data-testid="loading"
        className="mt-25 flex flex-col items-center gap-6"
      >
        <span
          aria-hidden="true"
          className="size-15 rounded-full border-4 border-primary/20 border-t-primary motion-safe:animate-spin"
        />
        <p className="text-base text-muted-foreground">Loading...</p>
      </div>
    </main>
  );
}
