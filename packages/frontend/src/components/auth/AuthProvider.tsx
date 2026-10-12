import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onIdTokenChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";
import { AuthContext, DefaultAuthState } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(DefaultAuthState);
  const queryClient = useQueryClient();

  useEffect(() => {
    let uid: string | null | undefined;

    return onIdTokenChanged(auth, (next) => {
      const nextUid = next?.uid ?? null;
      if (nextUid === uid) {
        void queryClient.invalidateQueries();
      } else {
        // Every cached query belongs to the previous user. Dropping them,
        // rather than invalidating, keeps the route guards from reading the
        // previous user's profile while a refetch is in flight.
        queryClient.removeQueries();
        uid = nextUid;
      }

      setAuthState({ user: next, isPending: false, isAuthed: next !== null });
    });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}
