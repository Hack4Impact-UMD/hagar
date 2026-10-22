import type {
  ActiveUserProfile,
  ApproveUserInput,
  DeleteUserInput,
  ListUsersInput,
  SetUserRegionInput,
  SetUserRoleInput,
  UserProfile,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

/** Lists the users in one stage that `actor` may manage. */
export function listUsers(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: ListUsersInput,
): Promise<UserProfile[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.list is not implemented yet.",
  });
}

/** Moves a user from awaiting approval to active. */
export function approveUser(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: ApproveUserInput,
): Promise<UserProfile> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.approve is not implemented yet.",
  });
}

/** Changes an active user's role. */
export function setUserRole(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: SetUserRoleInput,
): Promise<UserProfile> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.setRole is not implemented yet.",
  });
}

/**
 * Moves a user to another region. When a Local Admin does this, the user
 * goes back to awaiting approval as a Viewer.
 */
export function setUserRegion(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: SetUserRegionInput,
): Promise<UserProfile> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.setRegion is not implemented yet.",
  });
}

/** Deletes a user's profile and Firebase Auth account. Also used to reject. */
export function deleteUser(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: DeleteUserInput,
): Promise<void> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.delete is not implemented yet.",
  });
}
