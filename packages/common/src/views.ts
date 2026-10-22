import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";

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

export const view = type({ viewId: "string >= 1" }).and(storedView);
export type View = typeof view.infer;
