import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Only signs in. The route guards move the user on once the auth state
  // changes.
  const logIn = useMutation({
    mutationFn: () => signInWithEmailAndPassword(auth, email, password),
  });

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Log in</h1>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          logIn.mutate();
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
          data-testid="log-in"
          disabled={logIn.isPending}
          className="self-start border px-3 py-1"
        >
          Log in
        </button>
        {logIn.error ? <p role="alert">{logIn.error.message}</p> : null}
      </form>
      <p>
        No account yet?{" "}
        <Link to="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
