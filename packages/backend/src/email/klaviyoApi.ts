import { type } from "arktype";
import { defineSecret } from "firebase-functions/params";

/** Private API key, kept in Secret Manager. Functions using it must list it in `secrets`. */
export const klaviyoApiKey = defineSecret("KLAVIYO_API_KEY");

const KLAVIYO_BASE_URL = "https://a.klaviyo.com";
/** Klaviyo rejects requests without a revision; pinning keeps response shapes stable. */
const KLAVIYO_REVISION = "2026-07-15";

const MAX_RETRIES = 3;
/**
 * Longer waits mean a daily quota is exhausted. Sleeping that long would hold
 * a function open for hours, so the error is surfaced instead.
 */
const MAX_RETRY_AFTER_SECONDS = 60;
const BASE_BACKOFF_MS = 1000;
/** A hung socket would otherwise hold the function open until the platform kills it. */
const REQUEST_TIMEOUT_MS = 30_000;

export class KlaviyoApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "KlaviyoApiError";
    this.status = status;
  }
}

/** True for a 404, e.g. an ID that belongs to a list rather than a segment. */
export function isKlaviyoNotFound(error: unknown): boolean {
  return error instanceof KlaviyoApiError && error.status === 404;
}

const errorBody = type({
  "errors?": type({ "title?": "string", "detail?": "string" }).array(),
});

const pageLinks = type({ "links?": { "next?": "string | null" } });

type Method = "GET" | "POST";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const key = klaviyoApiKey.value();
  if (!key) {
    throw new Error("The KLAVIYO_API_KEY secret is empty or not set.");
  }
  return key;
}

function describe(url: URL): string {
  return `${url.pathname}${url.search}`;
}

/** Jitter keeps parallel callers from retrying in lockstep. */
function backoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** attempt * (1 + Math.random() * 0.25);
}

/** Milliseconds to wait before retrying: `Retry-After` if given, else backoff. */
function retryDelayMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header !== null) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return backoffMs(attempt);
}

async function failure(
  method: Method,
  url: URL,
  response: Response,
): Promise<KlaviyoApiError> {
  let details = "";
  try {
    const body = errorBody(await response.json());
    if (!(body instanceof type.errors) && body.errors?.length) {
      details = body.errors
        .map((e) => [e.title, e.detail].filter(Boolean).join(": "))
        .join("; ");
    }
  } catch {
    // A non-JSON error body still deserves the status-only message.
  }
  const message = `Klaviyo ${method} ${describe(url)} failed with ${response.status}${details ? `: ${details}` : ""}`;
  return new KlaviyoApiError(message, response.status);
}

/** Sends one request, retrying rate limits and outages, and returns the raw JSON. */
async function send(
  method: Method,
  url: URL,
  body?: unknown,
): Promise<unknown> {
  // The key is only read here so module load works without the secret.
  const headers: Record<string, string> = {
    Authorization: `Klaviyo-API-Key ${getApiKey()}`,
    revision: KLAVIYO_REVISION,
    accept: "application/vnd.api+json",
  };
  if (body !== undefined) {
    headers["content-type"] = "application/vnd.api+json";
  }

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(backoffMs(attempt));
      continue;
    }

    if (response.ok) {
      return response.json();
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) {
      throw await failure(method, url, response);
    }
    const delay = retryDelayMs(response, attempt);
    if (delay > MAX_RETRY_AFTER_SECONDS * 1000) {
      throw await failure(method, url, response);
    }
    await sleep(delay);
  }
}

function validate<T>(
  schema: (data: unknown) => T | type.errors,
  json: unknown,
  method: Method,
  url: URL,
): T {
  const result = schema(json);
  if (result instanceof type.errors) {
    throw new Error(
      `Klaviyo ${method} ${describe(url)} returned an unexpected shape: ${result.summary}`,
    );
  }
  return result;
}

function endpoint(path: string, params?: URLSearchParams): URL {
  const url = new URL(path, KLAVIYO_BASE_URL);
  if (params) {
    url.search = params.toString();
  }
  return url;
}

/** GETs one page and validates it against `schema`. */
export async function klaviyoGet<S extends type.Any>(
  path: string,
  params: URLSearchParams | undefined,
  schema: S,
): Promise<S["infer"]> {
  const url = endpoint(path, params);
  return validate(schema, await send("GET", url), "GET", url);
}

/** POSTs a JSON body and validates the response against `schema`. */
export async function klaviyoPost<S extends type.Any>(
  path: string,
  body: unknown,
  schema: S,
): Promise<S["infer"]> {
  const url = endpoint(path);
  return validate(schema, await send("POST", url, body), "POST", url);
}

/**
 * Follows `links.next` until it runs out. The next URL is absolute and comes
 * from the response, so its origin is checked before the API key is attached,
 * and repeats are refused so a misbehaving API cannot loop forever.
 */
async function allPages<S extends type.Any>(
  method: Method,
  first: URL,
  body: unknown,
  schema: S,
): Promise<S["infer"][]> {
  const pages: S["infer"][] = [];
  const seen = new Set<string>();
  let url: URL | null = first;

  while (url) {
    if (seen.has(url.href)) {
      throw new Error(
        `Klaviyo ${method} ${describe(url)} paginated back to a page already fetched.`,
      );
    }
    seen.add(url.href);

    const json = await send(method, url, body);
    pages.push(validate(schema, json, method, url));

    // Validated rather than ignored: a malformed link would otherwise end
    // pagination early and silently drop the remaining pages.
    const next = validate(pageLinks, json, method, url).links?.next ?? null;
    if (next === null) {
      url = null;
      continue;
    }
    // Assigned back to `url`, so an annotation keeps this initializer from referring to itself.
    const nextUrl: URL = new URL(next, url);
    if (nextUrl.origin !== KLAVIYO_BASE_URL) {
      throw new Error(
        `Klaviyo ${method} ${describe(url)} returned a next link to a different host (${nextUrl.origin}).`,
      );
    }
    url = nextUrl;
  }
  return pages;
}

/** GETs every page of a collection, returning each validated page. */
export function klaviyoGetAllPages<S extends type.Any>(
  path: string,
  params: URLSearchParams | undefined,
  schema: S,
): Promise<S["infer"][]> {
  return allPages("GET", endpoint(path, params), undefined, schema);
}

/** POSTs the same body to each page of a paginated endpoint such as reports. */
export function klaviyoPostAllPages<S extends type.Any>(
  path: string,
  body: unknown,
  schema: S,
): Promise<S["infer"][]> {
  return allPages("POST", endpoint(path), body, schema);
}
