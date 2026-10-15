import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@frontend/components/ui/button.tsx";
import { cn } from "@frontend/lib/utils.ts";

export function EmptyState({ message }: { message: string }) {
  return (
    <p
      data-testid="user-list-empty"
      className="py-12 text-center text-muted-foreground"
    >
      {message}
    </p>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p
      role="alert"
      data-testid="user-list-error"
      className="py-12 text-center text-destructive"
    >
      {message}
    </p>
  );
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-end gap-1", className)}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous page"
        data-testid="page-previous"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <CaretLeftIcon weight="bold" className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next page"
        data-testid="page-next"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <CaretRightIcon weight="bold" className="size-6" />
      </Button>
    </nav>
  );
}
