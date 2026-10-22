import type { ReactNode } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@frontend/components/ui/alert-dialog.tsx";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  pending?: boolean;
  /*Extra content between the description and the buttons */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  pending = false,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape and the overlay would otherwise close it mid-request.
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid="confirm-dialog-cancel"
            disabled={pending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-dialog-confirm"
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              // Radix closes the dialog on click; callers close it once the mutation settles instead.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? <CircleNotchIcon className="animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
