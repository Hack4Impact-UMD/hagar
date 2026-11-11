export const ACTION_MODES = ["resetPassword", "verifyEmail"] as const;

export type ActionMode = (typeof ACTION_MODES)[number];

export type ActionSearch = { mode?: ActionMode; oobCode?: string };

/**
 * Reads the params Firebase puts on email action links. Unknown modes and
 * empty codes come back undefined so the page can show one "invalid link"
 * message for anything it can't act on. `apiKey`, `continueUrl` and `lang` are
 * dropped: the app already has its API key and picks where users go next.
 */
export function parseActionSearch(
  search: Record<string, unknown>,
): ActionSearch {
  const { mode, oobCode } = search;
  return {
    mode: ACTION_MODES.find((known) => known === mode),
    oobCode: typeof oobCode === "string" && oobCode ? oobCode : undefined,
  };
}
