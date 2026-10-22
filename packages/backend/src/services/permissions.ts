import { canAssignRole, canManage } from "@repo/common";
import type { Actor, Target, UserRole } from "@repo/common";
import { TRPCError } from "@trpc/server";

/**
 * Throws unless `actor` may change `target` (see `canManage`). Read both in
 * the same transaction as the write. Otherwise two Global Admins could demote
 * each other at the same moment and leave none.
 */
export function assertCanManage(actor: Actor, target: Target): void {
  if (!canManage(actor, target)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage this user.",
    });
  }
}

export function assertCanAssignRole(actor: Actor, role: UserRole): void {
  if (!canAssignRole(actor, role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission to assign the ${role} role.`,
    });
  }
}
