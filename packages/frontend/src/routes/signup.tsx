import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
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

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Sign up</h1>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createAccount.mutate();
        }}
      >
        <label>
          Email{" "}
          <input
            type="email"
            required
            value={email}
            data-testid="email"
            onChange={(event) => setEmail(event.target.value)}
            className="border"
          />
        </label>
        <label>
          Password{" "}
          <input
            type="password"
            required
            value={password}
            data-testid="password"
            onChange={(event) => setPassword(event.target.value)}
            className="border"
          />
        </label>
        <button
          type="submit"
          data-testid="create-account"
          disabled={createAccount.isPending}
          className="self-start border px-3 py-1"
        >
          Create account
        </button>
        {createAccount.error ? (
          <p role="alert">{createAccount.error.message}</p>
        ) : null}
      </form>
      <p>
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
