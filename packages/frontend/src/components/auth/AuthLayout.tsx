import type { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  // The "switch to the other page" line shown under the title.
  prompt: ReactNode;
  onSubmit: () => void;
  error?: string;
  children: ReactNode;
};

export function AuthLayout({
  title,
  prompt,
  onSubmit,
  error,
  children,
}: AuthLayoutProps) {
  return (
    <main className="flex flex-row w-full h-screen overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col mx-4 sm:mx-8 my-6 sm:my-7.25">
        <img src="/logo.png" alt="Hagar Logo" className="w-28 sm:w-38.25" />
        {/* Centered in the space left under the logo, so the form's
            position doesn't shift with its own height (e.g. the signup
            page's extra password hint). */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex flex-col w-full max-w-lg lg:mx-12 xl:mx-24">
            <h1 className="font-bold text-3xl sm:text-[2.5em]">{title}</h1>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <p className="pt-2 pb-6">{prompt}</p>
              {children}
              {error ? (
                <p role="alert" className="text-red-600">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
      {/* Decorative, so it has no alt text for screen readers to announce. */}
      <img
        src="/sidebar.jpg"
        alt=""
        className="hidden lg:block h-screen w-[50.35vw] object-cover sticky top-0"
      />
    </main>
  );
}
