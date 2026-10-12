import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { router } from "@frontend/router.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";

/**
 * Reads the auth state from context and hands it to the router, so loaders and
 * `beforeLoad` guards see the signed-in user. Must render inside `AuthProvider`.
 */
export function App() {
  const auth = useAuth();
  const uid = auth.user?.uid;

  // Signing in or out never navigates by itself. Re-running the guards sends
  // the user to the page their new auth state belongs on.
  useEffect(() => {
    if (!auth.isPending) void router.invalidate();
  }, [auth.isPending, uid]);

  // Until Firebase restores the session, every user looks signed out and the
  // guards would bounce them to the login page.
  if (auth.isPending) return null;

  return <RouterProvider router={router} context={{ auth }} />;
}
