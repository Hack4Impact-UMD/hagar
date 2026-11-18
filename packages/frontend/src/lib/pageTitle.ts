const SITE_NAME = "Hagar";

/** The tab title for a route's `head`, e.g. "Calendar – Hagar". */
export function pageTitle(page: string) {
  return { meta: [{ title: `${page} – ${SITE_NAME}` }] };
}

/** The title of pages that don't name themselves, such as an unknown URL. */
export const DEFAULT_HEAD = { meta: [{ title: SITE_NAME }] };
