import {
  canEditView,
  canSeeView,
  canShareView,
  nowUtc,
  storedView,
} from "@repo/common";
import type {
  ActiveUserProfile,
  CopyViewInput,
  CreateViewInput,
  GetViewInput,
  SetViewShareOptionInput,
  StoredView,
  UpdateViewInput,
  View,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

export const COLLECTION = "views";

// Must match the name length cap in the `name` schema in @repo/common.
const MAX_NAME_LENGTH = 500;

// Drops any stray fields in the document so they never reach the client.
export const parseStoredView = storedView.onUndeclaredKey("delete");

/** Turns a `views/{id}` document into the shape procedures return. */
export function toView(id: string, data: unknown): View {
  return { viewId: id, ...parseStoredView.assert(data) };
}

/**
 * Thrown for a view that does not exist and for one the caller may not see.
 * The two look the same, so nobody can tell whether a private view exists.
 */
export function viewNotFound(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "That view does not exist.",
  });
}

/** Throws `NOT_FOUND` unless `actor` may see `stored`. */
export function assertCanSeeView(
  actor: ActiveUserProfile,
  stored: StoredView,
): void {
  if (!canSeeView(actor, stored)) throw viewNotFound();
}

/**
 * Throws `FORBIDDEN` unless `actor` may edit `stored`. Call
 * `assertCanSeeView` first, so a view the caller can't see is `NOT_FOUND`.
 */
export function assertCanEditView(
  actor: ActiveUserProfile,
  stored: StoredView,
): void {
  if (!canEditView(actor, stored)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to edit this view.",
    });
  }
}

/** Throws `FORBIDDEN` unless `actor` may change who `stored` is shared with. */
export function assertCanShareView(
  actor: ActiveUserProfile,
  stored: StoredView,
): void {
  if (!canShareView(actor, stored)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the author can change who a view is shared with.",
    });
  }
}

/**
 * Lists every view `actor` can see: their own, and everyone else's that are
 * shared. A Global Admin sees every view. Most recently updated first. No
 * pagination.
 */
export function listViews(
  _db: Firestore,
  _actor: ActiveUserProfile,
): Promise<View[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.list is not implemented yet.",
  });
}

/** Returns one view, or throws `NOT_FOUND` if it is missing or not visible. */
export function getView(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: GetViewInput,
): Promise<View> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.get is not implemented yet.",
  });
}

/**
 * Creates a view owned by `actor`. It starts private with no charts unless the
 * input says otherwise. Anyone may, Viewers included.
 */
export async function createView(
  db: Firestore,
  actor: ActiveUserProfile,
  input: CreateViewInput,
): Promise<View> {
  const ref = db.collection(COLLECTION).doc();
  const stored: StoredView = {
    name: input.name,
    authorUid: actor.uid,
    shareOption: input.shareOption ?? "PRIVATE",
    charts: input.charts ?? [],
    updatedAt: nowUtc(),
  };
  // `create` fails on an id clash instead of overwriting an existing view.
  await ref.create(stored);
  return toView(ref.id, stored);
}

/**
 * Makes a copy of a view the actor can see, owned by the actor. The copy is
 * named "Copy of <name>", has the same charts, and starts private whatever the
 * original's share option is. Anyone may, Viewers included.
 */
export function copyView(
  db: Firestore,
  actor: ActiveUserProfile,
  input: CopyViewInput,
): Promise<View> {
  // A transaction keeps the copy from reading a view the author has just made
  // private.
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(db.collection(COLLECTION).doc(input.viewId));
    if (!snapshot.exists) throw viewNotFound();
    const original = parseStoredView.assert(snapshot.data());
    assertCanSeeView(actor, original);

    const ref = db.collection(COLLECTION).doc();
    const copy: StoredView = {
      // Keeps the copy's name within the name length limit.
      name: `Copy of ${original.name}`.slice(0, MAX_NAME_LENGTH),
      authorUid: actor.uid,
      // A copy never inherits the original's sharing.
      shareOption: "PRIVATE",
      charts: original.charts,
      updatedAt: nowUtc(),
    };
    tx.create(ref, copy);
    return toView(ref.id, copy);
  });
}

/**
 * Changes a view's name and/or charts. Allowed for its author, or for any
 * non-Viewer when it is shared as `ANYONE_EDIT`. A Viewer can edit only
 * their own views.
 */
export function updateView(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: UpdateViewInput,
): Promise<View> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.update is not implemented yet.",
  });
}

/** Changes who a view is shared with. Only its author may. */
export function setViewShareOption(
  db: Firestore,
  actor: ActiveUserProfile,
  input: SetViewShareOptionInput,
): Promise<View> {
  // A transaction makes the author check use the view as it is when written.
  return db.runTransaction(async (tx) => {
    const ref = db.collection(COLLECTION).doc(input.viewId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw viewNotFound();
    const stored = parseStoredView.assert(snapshot.data());
    // Seeing comes first so a private view reads as missing, not forbidden.
    assertCanSeeView(actor, stored);
    assertCanShareView(actor, stored);

    // Saving the same option again still counts as an update.
    const changes = { shareOption: input.shareOption, updatedAt: nowUtc() };
    tx.update(ref, changes);
    return toView(ref.id, { ...stored, ...changes });
  });
}
