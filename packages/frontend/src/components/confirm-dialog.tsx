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
  /** Where focus goes on close. Needed when nothing opened the dialog through a Trigger. */
  onCloseAutoFocus?: (event: Event) => void;
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
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Escape and the overlay would otherwise close it mid-request.
        if (!pending) onOpenChange(next);
      }}
    >
      <AlertDialogContent
        data-testid="confirm-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
        className="gap-3 rounded-[0.75rem] bg-white p-5 shadow-[0_0.75rem_2rem_0_rgba(0,0,0,0.16)] sm:max-w-[28rem]"
      >
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-[1.0625rem] leading-normal font-semibold text-[#1F1F1F]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[0.9375rem] leading-[1.45] text-pretty text-[#6B6B6B]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel
            data-testid="confirm-dialog-cancel"
            className="h-auto cursor-pointer rounded-[0.5rem] border-[#D9D4CE] bg-white px-4 py-2 text-sm leading-normal"
            disabled={pending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-dialog-confirm"
            // `cn` doesn't merge conflicting utilities, so the destructive
            // variant's pale tint would otherwise beat the solid red.
            className={`h-auto cursor-pointer rounded-[0.5rem] px-4 py-2 text-sm leading-normal ${destructive ? "bg-[#DC3E42]! text-white! hover:bg-[#EC6753]!" : ""}`}
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
