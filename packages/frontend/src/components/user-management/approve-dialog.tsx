import type { UserRole } from "@repo/common";
import { useState } from "react";
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
  /* Only the roles the admin may hand out (see `canAssignRole`) */
  roles: readonly UserRole[];
  onApprove: (role: UserRole) => void;
}

export function ApproveDialog({
  open,
  onOpenChange,
  name,
  roles,
  onApprove,
}: ApproveDialogProps) {
  const [role, setRole] = useState<UserRole>("Viewer");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRole("Viewer");
        onOpenChange(next);
      }}
      title={`Approve ${name}?`}
      description="They'll be able to sign in with the role you choose."
      confirmLabel="Approve"
      onConfirm={() => onApprove(role)}
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span id="approve-role-label">Role</span>
        <Select
          value={role}
          onValueChange={(next) => setRole(next as UserRole)}
        >
          <SelectTrigger
            className="w-44"
            aria-labelledby="approve-role-label"
            data-testid="approve-role-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {roles.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ConfirmDialog>
  );
}
