import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type } from "arktype";
import {
  KlaviyoApiError,
  isKlaviyoNotFound,
  klaviyoGet,
  klaviyoGetAllPages,
  klaviyoPost,
  klaviyoPostAllPages,
} from "@backend/email/klaviyoApi.ts";

const secret = vi.hoisted(() => ({ value: "pk_test_secret" }));
vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => secret.value }),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  secret.value = "pk_test_secret";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

const page = type({ data: type({ id: "string" }).array() });

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), { status, headers });
}

function callAt(index: number): Parameters<typeof fetch> {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    throw new Error(`fetch call ${index} was not made`);
  }
  return call;
}

/** Resolves with the rejection so timers can advance before it is asserted. */
async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the request to fail");
}

function calledUrls(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("requests", () => {
  it("sends auth, revision and accept headers with encoded query params", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [] }));

    await klaviyoGet(
      "/api/lists",
      new URLSearchParams({ "fields[list]": "name", "page[size]": "100" }),
      page,
    );

    const [url, init] = callAt(0);
    expect(String(url)).toBe(
      "https://a.klaviyo.com/api/lists?fields%5Blist%5D=name&page%5Bsize%5D=100",
    );
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Authorization: "Klaviyo-API-Key pk_test_secret",
      revision: "2026-07-15",
      accept: "application/vnd.api+json",
    });
    expect(init?.body).toBeUndefined();
  });

  it("sends content-type and a JSON body on POST", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [] }));

    await klaviyoPost("/api/campaign-values-reports", { a: 1 }, page);

    const [, init] = callAt(0);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "content-type": "application/vnd.api+json",
    });
    expect(init?.body).toBe('{"a":1}');
  });

  it("returns validated data", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ id: "a" }] }));

    await expect(klaviyoGet("/api/lists", undefined, page)).resolves.toEqual({
      data: [{ id: "a" }],
    });
  });

  it("throws naming the endpoint when the shape is unexpected", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: "nope" }));

    await expect(klaviyoGet("/api/lists", undefined, page)).rejects.toThrow(
      /GET \/api\/lists returned an unexpected shape/,
    );
  });

  it("throws a clear error when the secret is empty", async () => {
    secret.value = "";

    await expect(klaviyoGet("/api/lists", undefined, page)).rejects.toThrow(
      /KLAVIYO_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pagination", () => {
  it("follows links.next until it is null", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          data: [{ id: "a" }],
          links: { next: "https://a.klaviyo.com/api/lists?page%5Bcursor%5D=2" },
        }),
      )
      .mockResolvedValueOnce(
        json({ data: [{ id: "b" }], links: { next: null } }),
      );

    const pages = await klaviyoGetAllPages("/api/lists", undefined, page);

    expect(pages.flatMap((p) => p.data.map((d) => d.id))).toEqual(["a", "b"]);
    expect(calledUrls()).toEqual([
      "https://a.klaviyo.com/api/lists",
      "https://a.klaviyo.com/api/lists?page%5Bcursor%5D=2",
    ]);
  });

  it("re-POSTs the same body to each next link", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          data: [],
          links: { next: "https://a.klaviyo.com/api/reports?page_cursor=2" },
        }),
      )
      .mockResolvedValueOnce(json({ data: [] }));

    await klaviyoPostAllPages("/api/reports", { a: 1 }, page);

    expect(fetchMock.mock.calls.map(([, init]) => init?.body)).toEqual([
      '{"a":1}',
      '{"a":1}',
    ]);
    expect(calledUrls()[1]).toBe(
      "https://a.klaviyo.com/api/reports?page_cursor=2",
    );
  });

  it("refuses a next link on another origin without requesting it", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: [], links: { next: "https://evil.example.com/api/lists" } }),
    );

    await expect(
      klaviyoGetAllPages("/api/lists", undefined, page),
    ).rejects.toThrow(/different host/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on a malformed next link instead of stopping early", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [], links: { next: 2 } }));

    await expect(
      klaviyoGetAllPages("/api/lists", undefined, page),
    ).rejects.toThrow(/unexpected shape/);
  });

  it("refuses a next link that repeats a fetched page", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json({
          data: [],
          links: { next: "https://a.klaviyo.com/api/lists?page=2" },
        }),
      ),
    );

    await expect(
      klaviyoGetAllPages("/api/lists", undefined, page),
    ).rejects.toThrow(/already fetched/);
  });
});

describe("retries", () => {
  it("waits Retry-After on 429 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 429, { "Retry-After": "5" }))
      .mockResolvedValueOnce(json({ data: [] }));

    const result = klaviyoGet("/api/lists", undefined, page);
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws immediately when Retry-After exceeds 60 seconds", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429, { "Retry-After": "61" }));

    await expect(
      klaviyoGet("/api/lists", undefined, page),
    ).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after three retries", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({}, 429, { "Retry-After": "1" })),
    );

    const result = klaviyoGet("/api/lists", undefined, page);
    const error = caught(result);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await error).toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("backs off exponentially on 503 without Retry-After", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ data: [] }));

    // Zero jitter makes the delays exactly 1s then 2s.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = klaviyoGet("/api/lists", undefined, page);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("errors", () => {
  it("reports status and Klaviyo detail without leaking the key", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        {
          errors: [{ title: "Forbidden", detail: "Missing scope lists:read" }],
        },
        403,
      ),
    );

    const error = await caught(klaviyoGet("/api/lists", undefined, page));

    expect(error).toBeInstanceOf(KlaviyoApiError);
    const { message, stack } = error as KlaviyoApiError;
    expect(message).toContain("GET /api/lists");
    expect(message).toContain("403");
    expect(message).toContain("Forbidden: Missing scope lists:read");
    for (const text of [
      message,
      stack ?? "",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    ]) {
      expect(text).not.toContain("pk_test_secret");
    }
  });

  it("detects a 404", async () => {
    fetchMock.mockResolvedValueOnce(json({ errors: [] }, 404));

    const error = await caught(klaviyoGet("/api/segments/x", undefined, page));

    expect(isKlaviyoNotFound(error)).toBe(true);
    expect(isKlaviyoNotFound(new Error("x"))).toBe(false);
  });
});
