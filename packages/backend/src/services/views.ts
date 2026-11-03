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
import type {
  QueryDocumentSnapshot,
  Firestore,
} from "firebase-admin/firestore";

export const COLLECTION = "views";

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
 * Throws `NOT_FOUND` if `viewId` contains "/" because .doc() reads the argument as a path 
 * and it should be a single document name, not a path into another collection or subcollection. 
 */
export function assertValidViewId(viewId: string): void {
  if (viewId.includes("/")) throw viewNotFound();
}

/**
 * Lists every view `actor` can see: their own, and everyone else's that are
 * shared. A Global Admin sees every view. Most recently updated first. No
 * pagination.
 */
export async function listViews(
  db: Firestore,
  actor: ActiveUserProfile,
): Promise<View[]> {
  const views = db.collection(COLLECTION);

  let docs: QueryDocumentSnapshot[];
  if (actor.role === "Global Admin") {
    const snapshots = await views.orderBy("updatedAt", "desc").get();
    docs = snapshots.docs;
  } else {
    const [mine, shared] = await Promise.all([
      views
        .where("authorUid", "==", actor.uid)
        .orderBy("updatedAt", "desc")
        .get(),
      views
        .where("shareOption", "in", ["ANYONE_VIEW", "ANYONE_EDIT"])
        .orderBy("updatedAt", "desc")
        .get(),
    ]);
    const idMapping = new Map<string, QueryDocumentSnapshot>();
    for (const doc of [...mine.docs, ...shared.docs]) {
      idMapping.set(doc.id, doc);
    }
    docs = [...idMapping.values()];
  }

  const results = docs.map((doc) => toView(doc.id, doc.data()));
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

/** Returns one view, or throws `NOT_FOUND` if it is missing or not visible. */
export async function getView(
  db: Firestore,
  actor: ActiveUserProfile,
  input: GetViewInput,
): Promise<View> {
  assertValidViewId(input.viewId);
  const entry = await db.collection(COLLECTION).doc(input.viewId).get();
  if (!entry.exists) throw viewNotFound();

  const view = toView(entry.id, entry.data());
  assertCanSeeView(actor, view);
  return view;
}

/**
 * Creates a view owned by `actor`. It starts private with no charts unless the
 * input says otherwise. Anyone may, Viewers included.
 */
export function createView(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: CreateViewInput,
): Promise<View> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.create is not implemented yet.",
  });
}

/**
 * Makes a copy of a view the actor can see, owned by the actor. The copy is
 * named "Copy of <name>", has the same charts, and starts private whatever the
 * original's share option is. Anyone may, Viewers included.
 */
export function copyView(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: CopyViewInput,
): Promise<View> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.copy is not implemented yet.",
  });
}

/**
 * Changes a view's name and/or charts. Allowed for its author, or for any
 * non-Viewer when it is shared as `ANYONE_EDIT`. A Viewer can edit only
 * their own views.
 */
export function updateView(
  db: Firestore,
  actor: ActiveUserProfile,
  input: UpdateViewInput,
): Promise<View> {
  return db.runTransaction(async (tx) => {
    assertValidViewId(input.viewId);
    const ref = db.collection(COLLECTION).doc(input.viewId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw viewNotFound();
    const stored = parseStoredView.assert(snap.data());

    assertCanSeeView(actor, stored);
    assertCanEditView(actor, stored);

    const changes: { name?: string; charts?: StoredView["charts"] } = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.charts !== undefined) changes.charts = input.charts;

    const updatedAt = nowUtc();
    tx.update(ref, { ...changes, updatedAt });

    return { viewId: input.viewId, ...stored, ...changes, updatedAt };
  });
}

/** Changes who a view is shared with. Only its author may. */
export function setViewShareOption(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: SetViewShareOptionInput,
): Promise<View> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "views.setShareOption is not implemented yet.",
  });
}
