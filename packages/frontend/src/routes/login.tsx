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
    <main className="flex flex-row w-full min-h-screen">
      <div className="flex-1 min-w-0 flex flex-col mx-4 sm:mx-8 my-6 sm:my-7.25 gap-10 md:gap-20 items-center">
        <img
          src="logo.png"
          alt="Hagar Logo"
          className="w-28 sm:w-38.25 self-start"
        />
        <div className="flex flex-col w-full max-w-lg lg:mx-12 xl:mx-24">
          <h1 className="font-bold text-3xl sm:text-[2.5em] font-700">Login</h1>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              logIn.mutate();
            }}
          >
            <p className="pt-2 pb-6">
              Don&apos;t have an account yet?{" "}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </p>
            <label className="flex flex-col text-1em font-semibold gap-2">
              Email{" "}
              <input
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                data-testid="email"
                onChange={(event) => setEmail(event.target.value)}
                className="border w-full h-12 sm:h-15 px-4 text-base rounded-[0.625em]"
              />
            </label>
            <label className="flex flex-col text-1em font-semibold gap-2">
              Password{" "}
              <input
                type="password"
                required
                value={password}
                data-testid="password"
                onChange={(event) => setPassword(event.target.value)}
                className="border w-full h-12 sm:h-15 px-4 text-base rounded-[0.625em]"
              />
            </label>
            {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="" className="underline flex justify-end pb-7.5">
              Forgot Password?
            </a>
            <button
              type="submit"
              data-testid="log-in"
              disabled={logIn.isPending}
              className="self-start border px-3 py-1 bg-primary text-white font-bold w-full h-14 sm:h-17.5 rounded-[0.625em] hover:bg-primary/90 cursor-pointer"
            >
              Log in
            </button>
            {logIn.error ? <p role="alert">{logIn.error.message}</p> : null}
          </form>
        </div>
      </div>
      <img
        src="sidebar.jpg"
        alt="Happy Girls"
        className="hidden lg:block h-screen w-[50.35vw] object-cover sticky top-0"
      />
    </main>
  );
}
