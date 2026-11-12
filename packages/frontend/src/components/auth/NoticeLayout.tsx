import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** Styles for the message and main button under a notice's title. */
export const NOTICE_TEXT = "mt-6 max-w-122.5 text-base/5 text-[#1c1917]";
export const NOTICE_BUTTON =
  "mt-8 h-17.5 w-full max-w-82.25 rounded-[10px] text-base font-semibold";

type NoticeLayoutProps = {
  icon: Icon;
  title: string;
  children: ReactNode;
};

/** A full-page card for auth steps that show a message instead of a form. */
export function NoticeLayout({
  icon: NoticeIcon,
  title,
  children,
}: NoticeLayoutProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f9f6f1] p-6">
      <div className="flex w-full max-w-5xl flex-col items-center justify-center gap-4 bg-card px-6 py-10 text-center sm:py-16">
        <div className="flex h-37.5 w-50 items-center justify-center bg-[#f1ded2]">
          <NoticeIcon aria-hidden size={160} className="text-white" />
        </div>
        <h1 className="mt-8 text-[40px]/12 font-bold text-[#1c1917]">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
