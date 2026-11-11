import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { AuthLayout } from "@frontend/components/auth/AuthLayout.tsx";
import { FormField } from "@frontend/components/form/FormField.tsx";
import { SubmitButton } from "@frontend/components/form/SubmitButton.tsx";
import {
  authErrorMessage,
  isBadCredentials,
} from "@frontend/lib/authErrors.ts";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Only signs in. The route guards move the user on once the auth state
  // changes.
  const logIn = useMutation({
    mutationFn: () => signInWithEmailAndPassword(auth, email, password),
    // Clears only a rejected password so a network error doesn't make the user
    // retype it.
    onError: (error) => {
      if (isBadCredentials(error)) setPassword("");
    },
  });
  // Success is not the end of the wait: the redirect to the next page only
  // happens after the route guards fetch the profile. Staying busy until this
  // page unmounts avoids a dead moment with an idle form.
  const busy = logIn.isPending || logIn.isSuccess;

  return (
    <AuthLayout
      title="Login"
      prompt={
        <>
          Don&apos;t have an account yet?{" "}
          <Link to="/signup" className="underline text-primary">
            Sign up
          </Link>
        </>
      }
      onSubmit={() => logIn.mutate()}
      error={logIn.error ? authErrorMessage(logIn.error) : undefined}
    >
      <FormField
        label="Email"
        type="email"
        required
        value={email}
        disabled={busy}
        data-testid="email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormField
        label="Password"
        type="password"
        required
        value={password}
        disabled={busy}
        data-testid="password"
        onChange={(event) => setPassword(event.target.value)}
      />
      <Link
        to="/forgot-password"
        className="underline flex justify-end pb-7.5 text-[#808080]"
      >
        Forgot Password?
      </Link>
      <SubmitButton pending={busy} data-testid="log-in">
        Login
      </SubmitButton>
    </AuthLayout>
  );
}
