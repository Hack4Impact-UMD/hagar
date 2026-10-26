import type { UserProfile, UserRegion, UserRole } from "@repo/common";
import { userRegions } from "@repo/common";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { UserAvatar } from "@frontend/components/user-management/user-avatar.tsx";
import { fullName } from "@common/user-helpers.ts";

export interface UserChanges {
  role?: UserRole;
  region?: UserRegion;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile;
  /* Only the roles the admin may hand out (see `canAssignRole`) */
  roles: readonly UserRole[];
  /* True for Local Admins, whose region moves send the user back for approval */
  moveResetsApproval: boolean;
  pending: boolean;
  onSave: (changes: UserChanges) => void;
  onRemove: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  pending,
  onRemove,
  ...formProps
}: EditUserDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        data-testid="edit-user-dialog"
        className="sm:max-w-xl px-10 max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="text-[1.5rem] leading-normal font-bold text-black">
            Edit User
          </DialogTitle>
          <Button
            type="button"
            size="sm"
            className="rounded-sm text-[0.75rem] bg-[#DC3E42] text-white hover:bg-[#DC3E42]/90"
            data-testid="edit-user-remove"
            disabled={pending}
            onClick={onRemove}
          >
            Delete User
          </Button>
        </DialogHeader>
        {/* Content unmounts on close, so the form starts fresh on every open. */}
        <EditUserForm
          pending={pending}
          onClose={() => onOpenChange(false)}
          {...formProps}
        />
      </DialogContent>
    </Dialog>
  );
}

// there are no admin endpoints to change these
const READ_ONLY_FIELDS = [
  { key: "firstName", label: "First Name", half: true },
  { key: "lastName", label: "Last Name", half: true },
  { key: "email", label: "Email", half: false },
  { key: "phoneNumber", label: "Phone Number", half: false },
] as const;

const FIELD_LABEL = "flex flex-col text-sm leading-[1.75rem] text-[#464646]";
const FIELD_BOX =
  "rounded-[0.5rem] border-[#8A8A8A] px-3 text-sm font-medium text-black shadow-none md:text-sm";

function EditUserForm({
  user,
  roles,
  moveResetsApproval,
  pending,
  onSave,
  onClose,
}: Omit<EditUserDialogProps, "open" | "onOpenChange" | "onRemove"> & {
  onClose: () => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [region, setRegion] = useState<UserRegion | undefined>(
    user.region ?? undefined,
  );
  const id = useId();
  const movingAway = moveResetsApproval && region !== user.region;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const changes: UserChanges = {};
        // The backend resets the role on this move, so a role change would be lost.
        if (role !== user.role && !movingAway) changes.role = role;
        if (region && region !== user.region) changes.region = region;
        if (Object.keys(changes).length === 0) onClose();
        else onSave(changes);
      }}
    >
      <fieldset disabled={pending} className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-6 py-4">
          <UserAvatar user={user} className="size-28" />
          <div>
            <p className="text-xl">{fullName(user)}</p>
            <p className="text-base text-[#808080]">Role: {user.role}</p>
            <p className="text-base text-[#808080]">Region: {user.region}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {READ_ONLY_FIELDS.map((field) => (
            <label
              key={field.key}
              className={`${FIELD_LABEL} ${field.half ? "" : "col-span-2"}`}
            >
              {field.label}
              {/* Disabled for semantics, but drawn at full strength to match the other fields */}
              <Input
                value={user[field.key] ?? ""}
                readOnly
                disabled
                className={`h-8 ${FIELD_BOX} disabled:cursor-default disabled:opacity-100`}
              />
            </label>
          ))}

          <div className={`col-span-2 ${FIELD_LABEL}`}>
            <span id={`${id}-role`}>Role</span>
            <Select
              value={movingAway ? "Viewer" : role}
              onValueChange={(next) => setRole(next as UserRole)}
              disabled={pending || movingAway}
            >
              <SelectTrigger
                className={`w-full data-[size=default]:h-8 ${FIELD_BOX}`}
                aria-labelledby={`${id}-role`}
                data-testid="edit-role"
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

          <div className={`col-span-2 ${FIELD_LABEL}`}>
            <span id={`${id}-region`}>Region</span>
            <Select
              value={region}
              onValueChange={(next) => setRegion(next as UserRegion)}
              disabled={pending}
            >
              <SelectTrigger
                className={`w-full data-[size=default]:h-8 ${FIELD_BOX}`}
                aria-labelledby={`${id}-region`}
                data-testid="edit-region"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {userRegions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {movingAway ? (
              <p
                role="alert"
                className="mt-1.5 text-sm leading-normal text-destructive"
              >
                {user.firstName} will lose their role and need to be approved
                again by an admin in {region}.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              size="sm"
              className="rounded-sm text-[0.875rem] border-[#C75C3B] bg-white text-[#C75C3B] hover:bg-[#C75C3B]/10 hover:text-[#C75C3B]"
              variant="outline"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            size="sm"
            className="rounded-sm text-[0.875rem] bg-[#C75C3B] text-white hover:bg-[#C75C3B]/90"
            data-testid="edit-user-save"
          >
            {pending ? <CircleNotchIcon className="animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </fieldset>
    </form>
  );
}
