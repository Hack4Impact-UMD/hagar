import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@frontend/components/ui/button.tsx";

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
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-2 text-sm text-muted-foreground"
    >
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous page"
        data-testid="page-previous"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <CaretLeftIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next page"
        data-testid="page-next"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <CaretRightIcon />
      </Button>
    </nav>
  );
}
