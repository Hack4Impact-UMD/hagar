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
    <main className="flex flex-row w-full">
      <div className="w-[50%] flex flex-col mx-8 my-7.25 gap-20">
        <img src="logo.png" alt="Hagar Logo" className="w-38.25" />
        <div className="flex flex-col mx-32">
          <h1 className="font-bold text-[40px] font-700">Sign up</h1>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              createAccount.mutate();
            }}
          >
            <p>
              Already have an account?{" "}
              <Link to="/login" className="underline">
                Log in
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
            <a href="" className="flex justify-start pb-10 text-chart-3">
              At least 8 character
            </a>
            <button
              type="submit"
              data-testid="create-account"
              disabled={createAccount.isPending}
              className="self-start border px-3 py-1 bg-primary text-white font-bold w-full h-17.5 rounded-[10px] hover:bg-primary/90 cursor-pointer"
            >
              Create account
            </button>
            {createAccount.error ? <p role="alert">{createAccount.error.message}</p> : null}
          </form>
        </div>
      </div>
      <img src="girl.png" alt="Happy Girl" className="w-181.25" />
    </main>
  );
}
