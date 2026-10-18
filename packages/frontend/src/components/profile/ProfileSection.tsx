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
    <section className="rounded-none border bg-card text-card-foreground">
      <header className="flex min-h-20 items-center justify-between border-b px-6 py-2 md:px-8">
        <h2 className="text-2xl font-medium">{title}</h2>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Edit ${title}`}
            onClick={onEdit}
          >
            <PencilSimpleIcon className="size-5" />
          </Button>
        ) : null}
      </header>
      <div className="px-6 py-6 md:px-8">{children}</div>
    </section>
  );
}
