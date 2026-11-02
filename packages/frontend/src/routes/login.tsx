import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  AuthField,
  AuthLayout,
  AuthSubmitButton,
} from "@frontend/components/auth/AuthLayout.tsx";
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
      <AuthField
        label="Email"
        type="email"
        required
        value={email}
        disabled={logIn.isPending}
        data-testid="email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <AuthField
        label="Password"
        type="password"
        required
        value={password}
        disabled={logIn.isPending}
        data-testid="password"
        onChange={(event) => setPassword(event.target.value)}
      />
      {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a href="" className="underline flex justify-end pb-7.5 text-[#808080]">
        Forgot Password?
      </a>
      <AuthSubmitButton pending={logIn.isPending} data-testid="log-in">
        Login
      </AuthSubmitButton>
    </AuthLayout>
  );
}
