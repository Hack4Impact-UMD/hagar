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
import { parseStored } from "@backend/services/users.ts";
const COLLECTION = "users";

/** Lists the users in one stage that `actor` may manage. */
export async function listUsers(
  db: Firestore,
  actor: ActiveUserProfile,
  input: ListUsersInput,
): Promise<UserProfile[]> {
  let region = input.region;
  if (actor.role === "Local Admin") {
    if (region !== undefined && region !== actor.region) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Local Admins can only list users in their own region.",
      });
    }
    region = actor.region;
  }

  // Only these two query shapes have composite indexes in
  // firestore.indexes.json. Any other filter or sort fails in production.
  let query = db.collection(COLLECTION).where("stage", "==", input.stage);
  if (region !== undefined) query = query.where("region", "==", region);
  const snapshot = await query.orderBy("createdAt").get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...parseStored.assert(doc.data()),
  }));
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
