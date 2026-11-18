import type { UserRole } from "@repo/common";
import { useId, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { ConfirmDialog } from "@frontend/components/user-management/confirm-dialog.tsx";

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  pending: boolean;
  /* Only the roles the admin may hand out (see `canAssignRole`) */
  roles: readonly UserRole[];
  onApprove: (role: UserRole) => void;
}

export function ApproveDialog({
  open,
  onOpenChange,
  name,
  pending,
  roles,
  onApprove,
}: ApproveDialogProps) {
  const [role, setRole] = useState<UserRole>("Viewer");
  const [wasOpen, setWasOpen] = useState(open);
  const labelId = useId();

  // The parent can close the dialog without going through `onOpenChange`
  // (e.g. when a request settles), so reset on the prop itself.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setRole("Viewer");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Approve ${name}?`}
      pending={pending}
      description="They'll be able to sign in with the role you choose."
      confirmLabel="Approve"
      onConfirm={() => onApprove(role)}
    >
      <div className="flex items-center justify-between text-[0.9375rem] leading-[1.45]">
        <span id={labelId}>Role</span>
        <Select
          value={role}
          disabled={pending}
          onValueChange={(next) => setRole(next as UserRole)}
        >
          <SelectTrigger
            className="w-40 cursor-pointer text-[0.9375rem] data-[size=default]:h-9"
            aria-labelledby={labelId}
            data-testid="approve-role-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {roles.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="cursor-pointer"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ConfirmDialog>
  );
}
