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
    <section className="card rounded-none">
      <header className="card-header min-h-20 px-6 md:px-8">
        <h2 className="card-title text-2xl">{title}</h2>
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
      <div className="card-body px-6 py-6 md:px-8">{children}</div>
    </section>
  );
}
