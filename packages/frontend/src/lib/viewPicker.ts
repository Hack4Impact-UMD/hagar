import type { View } from "@repo/common";

/**
 * The one way to show a user's name. The picker filters on this same text, so
 * what someone types matches what they see.
 */
export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * The views whose name or author's name contains `query`, ignoring case and
 * surrounding spaces, in their original order. An empty query keeps them all.
 * An author missing from `authorNames` can still match on the view's name.
 */
export function filterViewOptions(views: View[], authorNames: Map<string, string>, query: string) {
  const q = query.trim().toLowerCase();
  return views.filter((v) => !q || v.name.toLowerCase().includes(q) || authorNames.get(v.authorUid)?.toLowerCase().includes(q));
}
