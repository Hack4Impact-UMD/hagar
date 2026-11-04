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
    <main className="flex flex-row w-full min-h-screen">
      {/* The equal 1fr rows above and below the form keep it centered in the
          whole column, with the logo pinned to the top row. */}
      <div className="flex-1 min-w-0 grid grid-rows-[1fr_auto_1fr] justify-items-center mx-4 sm:mx-8 my-6 sm:my-7.25 gap-y-10 md:gap-y-20">
        <img
          src="/logo.png"
          alt="Hagar Logo"
          className="w-28 sm:w-38.25 justify-self-start"
        />
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
      {/* Decorative, so it has no alt text for screen readers to announce. */}
      <img
        src="/sidebar.jpg"
        alt=""
        className="hidden lg:block h-screen w-[50.35vw] object-cover sticky top-0"
      />
    </main>
  );
}
