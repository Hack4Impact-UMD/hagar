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
    <main className="flex flex-row w-full h-screen">
      <div className="w-[50%] flex flex-col mx-8 my-7.25 gap-20">
        <img src="logo.png" alt="Hagar Logo" className="w-38.25" />
        <div className="flex flex-col mx-32">
          <h1 className="font-bold text-[40px] font-700">Login</h1>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              logIn.mutate();
            }}
          >
            <p>
              Don't have an account yet?{" "}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </p>
            <label className="flex flex-col text-[16px] font-semibold gap-2">
              Email{" "}
              <input
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                data-testid="email"
                onChange={(event) => setEmail(event.target.value)}
                className="border h-15 px-4 rounded-[10px]"
              />
            </label>
            <label className="flex flex-col text-[16px] font-semibold gap-2">
              Password <input type="password" required value={password} data-testid="password" onChange={(event) => setPassword(event.target.value)} className="border h-15 px-4 rounded-[10px]" />
            </label>
            <a href="" className="underline flex justify-end pb-10">
              Forgot Password?
            </a>
            <button
              type="submit"
              data-testid="log-in"
              disabled={logIn.isPending}
              className="self-start border px-3 py-1 bg-primary text-white font-bold w-full h-17.5 rounded-[10px] hover:bg-primary/90 cursor-pointer"
            >
              Log in
            </button>
            {logIn.error ? <p role="alert">{logIn.error.message}</p> : null}
          </form>
        </div>
      </div>
      <img src="girl.png" alt="Happy Girl" className="w-181.25" />
    </main>
  );
}
