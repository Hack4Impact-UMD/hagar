import { createRouter } from "@tanstack/react-router";
import { LoadingPage } from "@frontend/components/LoadingPage.tsx";
import { routeTree } from "@frontend/routeTree.gen.ts";
import { DefaultAuthState } from "@frontend/lib/useAuth.ts";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  // Renders unknown URLs with the root's 404 page, outside the sidebar layout.
  notFoundMode: "root",
  defaultPendingComponent: LoadingPage,
  context: {
    auth: DefaultAuthState,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
