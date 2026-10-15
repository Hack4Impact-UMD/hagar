import type {
  ActiveUserProfile,
  Actor,
  ApproveUserInput,
  DeleteUserInput,
  ListUsersInput,
  SetUserRegionInput,
  SetUserRoleInput,
  StoredUserProfile,
  UserProfile,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import { getAuth } from "firebase-admin/auth";
import type {
  DocumentReference,
  Firestore,
  Transaction,
} from "firebase-admin/firestore";
import {
  assertCanAssignRole,
  assertCanManage,
} from "@backend/services/permissions.ts";
import { deleteProfilePhotos } from "@backend/services/profilePhotos.ts";
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

  // Only these two query shapes have composite indexes in firestore.indexes.json. Any other filter or sort fails.
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
  db: Firestore,
  actor: ActiveUserProfile,
  input: ApproveUserInput,
): Promise<UserProfile> {
  const role = input.role ?? "Viewer";
  return manageUser(db, actor, input.uid, ({ tx, ref, actor, target }) => {
    assertCanAssignRole(actor, role);
    assertStage(target, ["AWAITING APPROVAL"]);
    const changes = { stage: "ACTIVE", role } as const;
    tx.update(ref, changes);
    return { ...target, ...changes };
  });
}

/** Changes an active user's role. */
export function setUserRole(
  db: Firestore,
  actor: ActiveUserProfile,
  input: SetUserRoleInput,
): Promise<UserProfile> {
  return manageUser(db, actor, input.uid, ({ tx, ref, actor, target }) => {
    assertCanAssignRole(actor, input.role);
    // Users awaiting approval get their role when they are approved.
    assertStage(target, ["ACTIVE"]);
    const changes = { role: input.role };
    tx.update(ref, changes);
    return { ...target, ...changes };
  });
}

/**
 * Moves a user to another region. When a Local Admin does this, the user
 * goes back to awaiting approval as a Viewer.
 */
export function setUserRegion(
  db: Firestore,
  actor: ActiveUserProfile,
  input: SetUserRegionInput,
): Promise<UserProfile> {
  return manageUser(db, actor, input.uid, ({ tx, ref, actor, target }) => {
    // Users still in setup or verifying their email have no settled region.
    assertStage(target, ["AWAITING APPROVAL", "ACTIVE"]);
    // Staying put is not a move, so it must not send anyone back to approval.
    if (target.region === input.region) return target;

    // A Local Admin hands the user to another region's admins, who decide
    // for themselves whether to approve them and with what role.
    const changes =
      actor.role === "Global Admin"
        ? { region: input.region }
        : ({
            region: input.region,
            role: "Viewer",
            stage: "AWAITING APPROVAL",
          } as const);
    tx.update(ref, changes);
    return { ...target, ...changes };
  });
}

/** Deletes a user's profile and Firebase Auth account. Also used to reject. */
export async function deleteUser(
  db: Firestore,
  actor: ActiveUserProfile,
  input: DeleteUserInput,
): Promise<void> {
  await manageUser(db, actor, input.uid, ({ tx, ref, target }) => {
    tx.delete(ref);
    return target;
  });

  // Kept outside the transaction: Firestore may run the transaction body more
  // than once, and the commit can still fail after the account is gone.
  // Both cleanups are attempted even if one fails, because a retry finds no
  // profile and stops at NOT_FOUND before reaching them.
  const results = await Promise.allSettled([
    getAuth()
      .deleteUser(input.uid)
      .catch((error: unknown) => {
        if ((error as { code?: unknown }).code !== "auth/user-not-found") {
          throw error;
        }
      }),
    deleteProfilePhotos(input.uid),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) {
    console.error(
      `Cleanup failed after deleting user ${input.uid}`,
      failure.reason,
    );
  }
  if (failures[0]) throw failures[0].reason;
}

type ManageContext = {
  tx: Transaction;
  ref: DocumentReference;
  /** The caller as stored right now, not as the middleware saw them. */
  actor: Actor;
  target: StoredUserProfile;
};

/**
 * Runs `change` in a transaction after re-reading the caller and the target,
 * refusing a caller who is no longer an active user and a target that is
 * missing or out of the caller's reach. Re-reading the caller is what refuses
 * an admin demoted after the middleware ran, and what stops two Global Admins
 * from demoting each other at the same moment and leaving none.
 *
 * `change` runs after both reads, so it may write but must not read. Further
 * checks belong at its start, permissions before stage, so a caller learns
 * nothing about users they cannot manage.
 */
async function manageUser(
  db: Firestore,
  staleActor: ActiveUserProfile,
  uid: string,
  change: (context: ManageContext) => StoredUserProfile,
): Promise<UserProfile> {
  const users = db.collection(COLLECTION);
  const actorRef = users.doc(staleActor.uid);
  const ref = users.doc(uid);

  const stored = await db.runTransaction(async (tx) => {
    const [actorSnapshot, targetSnapshot] = await tx.getAll(actorRef, ref);

    const actorDoc = actorSnapshot?.exists
      ? parseStored.assert(actorSnapshot.data())
      : undefined;
    if (actorDoc?.stage !== "ACTIVE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only active users can manage other users.",
      });
    }
    const actor: Actor = {
      uid: staleActor.uid,
      role: actorDoc.role,
      region: actorDoc.region,
    };

    if (!targetSnapshot?.exists) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No user exists with this ID.",
      });
    }
    const target = parseStored.assert(targetSnapshot.data());
    assertCanManage(actor, { uid, role: target.role, region: target.region });

    return change({ tx, ref, actor, target });
  });

  return { uid, ...stored };
}

type Stage = StoredUserProfile["stage"];

function assertStage<S extends Stage>(
  target: StoredUserProfile,
  allowed: readonly S[],
): asserts target is StoredUserProfile & { stage: S } {
  if (!(allowed as readonly Stage[]).includes(target.stage)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `This action is not available for users in the ${target.stage} stage.`,
    });
  }
}
