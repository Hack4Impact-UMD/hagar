import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";
import type { UserProfile } from "@common/user.ts";

// Length caps exist only to bound abuse. They sit far above any real value.
const name = type("1 <= string <= 500");

/**
 * A single chart or metric on a view. Only its name is defined for now.
 * Reports copy these as they stand, so a report keeps what the view showed.
 */
export const chartDefinition = type({ name });
export type ChartDefinition = typeof chartDefinition.infer;

/**
 * Who besides the author can open a view. `ANYONE_EDIT` includes viewing.
 */
export const viewShareOption = type(
  "'PRIVATE' | 'ANYONE_VIEW' | 'ANYONE_EDIT'",
);
export type ViewShareOption = typeof viewShareOption.infer;

/** The shape stored at `views/{viewId}`. `viewId` is the document id. */
export const storedView = type({
  name,
  authorUid: "0 < string <= 128",
  shareOption: viewShareOption,
  charts: chartDefinition.array(),
  updatedAt: utcDateString,
});
export type StoredView = typeof storedView.infer;

const viewId = type("string >= 1");

export const view = type({ viewId }).and(storedView);
export type View = typeof view.infer;

/**
 * Who a view is shown to and who may change it. Anyone who can't see a view
 * can't edit or share it either.
 *
 * The backend enforces these; the frontend uses them only to hide controls
 * the backend would refuse.
 */
type ViewUser = Pick<UserProfile, "uid" | "role">;
type ViewAccess = Pick<StoredView, "authorUid" | "shareOption">;

/**
 * The author always sees their view, and a Global Admin sees every view. For
 * everyone else it has to be shared.
 */
export function canSeeView(user: ViewUser, v: ViewAccess): boolean {
  return (
    user.role === "Global Admin" ||
    v.authorUid === user.uid ||
    v.shareOption !== "PRIVATE"
  );
}

/**
 * Everyone edits their own views, Viewers included. Other people's views can be
 * edited only by someone who is not a Viewer, and only when the author allows
 * `ANYONE_EDIT`. Seeing a view gives a Global Admin no extra right to edit it.
 */
export function canEditView(user: ViewUser, v: ViewAccess): boolean {
  if (v.authorUid === user.uid) return true;
  return user.role !== "Viewer" && v.shareOption === "ANYONE_EDIT";
}

/** Only the author changes who a view is shared with, whatever their role. */
export function canShareView(
  user: Pick<ViewUser, "uid">,
  v: ViewAccess,
): boolean {
  return v.authorUid === user.uid;
}

// Every procedure input rejects undeclared keys. ArkType passes them through
// by default, which would let a caller send fields like `authorUid` along.
const chartInput = chartDefinition.onUndeclaredKey("reject");

export const getViewInput = type({ viewId }).onUndeclaredKey("reject");
export type GetViewInput = typeof getViewInput.infer;

export const copyViewInput = type({ viewId }).onUndeclaredKey("reject");
export type CopyViewInput = typeof copyViewInput.infer;

/** A new view starts private and empty unless the caller says otherwise. */
export const createViewInput = type({
  name,
  "charts?": chartInput.array(),
  "shareOption?": viewShareOption,
}).onUndeclaredKey("reject");
export type CreateViewInput = typeof createViewInput.infer;

/** Changes only the fields that are present. At least one must be. */
export const updateViewInput = type({
  viewId,
  "name?": name,
  "charts?": chartInput.array(),
})
  .onUndeclaredKey("reject")
  .narrow(
    (input, ctx) =>
      input.name !== undefined ||
      input.charts !== undefined ||
      ctx.mustBe("an update that changes the name or the charts"),
  );
export type UpdateViewInput = typeof updateViewInput.infer;

export const setViewShareOptionInput = type({
  viewId,
  shareOption: viewShareOption,
}).onUndeclaredKey("reject");
export type SetViewShareOptionInput = typeof setViewShareOptionInput.infer;
