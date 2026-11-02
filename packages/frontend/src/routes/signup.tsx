import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { AuthLayout } from "@frontend/components/auth/AuthLayout.tsx";
import { FormField } from "@frontend/components/form/FormField.tsx";
import { SubmitButton } from "@frontend/components/form/SubmitButton.tsx";
import { authErrorMessage } from "@frontend/lib/authErrors.ts";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Only creates the account, which also signs the user in. The route guards
  // move them on to profile setup once the auth state changes.
  const createAccount = useMutation({
    mutationFn: () => createUserWithEmailAndPassword(auth, email, password),
  });
  // Success is not the end of the wait: the redirect to the next page only
  // happens after the route guards fetch the new profile. Staying busy until
  // this page unmounts avoids a dead moment with an idle form.
  const busy = createAccount.isPending || createAccount.isSuccess;

  return (
    <AuthLayout
      title="Sign up"
      prompt={
        <>
          Already have an account?{" "}
          <Link to="/login" className="underline text-primary">
            Login
          </Link>
        </>
      }
      onSubmit={() => createAccount.mutate()}
      error={
        createAccount.error ? authErrorMessage(createAccount.error) : undefined
      }
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
        minLength={8}
        value={password}
        disabled={busy}
        data-testid="password"
        onChange={(event) => setPassword(event.target.value)}
      />
      <p className="flex justify-start pb-7.5 text-chart-3">
        At least 8 characters
      </p>
      <SubmitButton pending={busy} data-testid="create-account">
        Create account
      </SubmitButton>
    </AuthLayout>
  );
}
