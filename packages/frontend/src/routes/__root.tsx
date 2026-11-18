import {
  createRootRouteWithContext,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { NotFound } from "@frontend/components/NotFound.tsx";
import { DEFAULT_HEAD } from "@frontend/lib/pageTitle.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";
import { redirectFor } from "@frontend/lib/userFlow.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

interface RouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Routes override this with their own title.
  head: () => DEFAULT_HEAD,
  // Every navigation passes through here, so this is the only place that
  // decides which page a user may see. See `lib/userFlow.ts`.
  beforeLoad: async ({ context, location }) => {
    // Cached for good: stage changes write the new profile into the cache
    // (see the profile setup page), `me` is refetched when it can advance
    // the stage (see the verify email page), and signing out or switching
    // users drops it.
    const profile = context.auth.isAuthed
      ? await queryClient.query({
          ...trpc.me.queryOptions(),
          staleTime: "static",
        })
      : null;

    const to = redirectFor(profile, location.pathname);
    if (to) throw redirect({ to });
  },
  component: RootLayout,
  // Every unknown URL renders here, full page (see `notFoundMode` in
  // `router.tsx`).
  notFoundComponent: NotFound,
});

function RootLayout() {
  // The innermost route that sets a title wins.
  const title = useRouterState({
    select: (state) =>
      state.matches
        .flatMap((match) => match.meta ?? [])
        .findLast((meta) => meta?.title)?.title,
  });

  // Set directly because rendering a `<title>` makes React swap the element on
  // every navigation, and not every browser updates the tab for that.
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  return <Outlet />;
}
