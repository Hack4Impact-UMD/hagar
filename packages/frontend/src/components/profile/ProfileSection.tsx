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
    <section>
      <header>
        <h2>{title}</h2>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${title}`}
            onClick={onEdit}
          >
            <PencilSimpleIcon />
          </Button>
        ) : null}
      </header>
      {children}
    </section>
  );
}
