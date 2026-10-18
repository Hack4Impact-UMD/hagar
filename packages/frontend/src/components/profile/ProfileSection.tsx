import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@frontend/components/ui/button.tsx";

interface ProfileSectionProps {
  title: string;
  /** Shows an edit button in the header. Omit it while already editing. */
  onEdit?: () => void;
  children: ReactNode;
}

export function ProfileSection({
  title,
  onEdit,
  children,
}: ProfileSectionProps) {
  return (
    <section className="rounded-none border border-black/10 bg-card text-card-foreground md:mt-7 md:mr-1.5 md:ml-4.5">
      <header className="flex h-18.75 items-center gap-2.5 border-b pr-6 pl-6 md:pr-[1.59375rem] md:pl-[1.84375rem]">
        <h2 className="flex-1 text-[1.375rem] leading-none font-semibold text-black/80">
          {title}
        </h2>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="size-6"
            aria-label={`Edit ${title}`}
            onClick={onEdit}
          >
            <PencilSimpleIcon className="size-6" />
          </Button>
        ) : null}
      </header>
      <div className="px-6 pt-4 pb-12.25 md:px-[1.84375rem]">{children}</div>
    </section>
  );
}
