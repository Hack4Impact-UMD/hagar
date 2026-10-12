import {
  createRootRouteWithContext,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";
import { redirectFor } from "@frontend/lib/userFlow.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

interface RouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
  component: Outlet,
});
