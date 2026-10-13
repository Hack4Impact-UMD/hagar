import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getAllLists, updateList } from "@backend/email/klaviyo.ts";
import { KlaviyoApiError } from "@backend/email/klaviyoApi.ts";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "pk_test_secret" }),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function listResponse(name: string, count: number) {
  return json({
    data: { id: "L1", attributes: { name, profile_count: count } },
  });
}

function requestedUrl(index: number): URL {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    throw new Error(`fetch call ${index} was not made`);
  }
  return new URL(String(call[0]));
}

const t1 = new Date("2026-01-01T00:00:00Z");
const t2 = new Date("2026-02-01T00:00:00Z");

describe("getAllLists", () => {
  it("returns IDs across pages in order", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          data: [{ id: "a" }, { id: "b" }],
          links: { next: "https://a.klaviyo.com/api/lists?page%5Bcursor%5D=2" },
        }),
      )
      .mockResolvedValueOnce(
        json({ data: [{ id: "c" }], links: { next: null } }),
      );

    await expect(getAllLists()).resolves.toEqual(["a", "b", "c"]);
    expect(requestedUrl(0).searchParams.get("fields[list]")).toBe("name");
    expect(requestedUrl(0).searchParams.has("page[size]")).toBe(false);
  });

  it("propagates a Klaviyo error", async () => {
    fetchMock.mockResolvedValueOnce(json({ errors: [] }, 403));

    await expect(getAllLists()).rejects.toBeInstanceOf(KlaviyoApiError);
  });
});

describe("updateList", () => {
  const existing = (count: number) => ({
    platform: "Klaviyo",
    platformListID: "L1",
    name: "Old name",
    lastFetchedAt: t1,
    snapshots: [{ count, fetchedAt: t1 }],
  });

  it("creates the document with one snapshot when missing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t2);
    fetchMock.mockResolvedValueOnce(listResponse("Newsletter", 10));
    const { db, doc } = fakeFirestore();

    await updateList(db, "L1");

    expect(doc("email-lists", "Klaviyo_L1")).toEqual({
      platform: "Klaviyo",
      platformListID: "L1",
      name: "Newsletter",
      lastFetchedAt: t2,
      snapshots: [{ count: 10, fetchedAt: t2 }],
    });
  });

  it("adds no snapshot when the count is unchanged", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t2);
    fetchMock.mockResolvedValueOnce(listResponse("Renamed", 10));
    const { db, doc } = fakeFirestore({
      "email-lists": { Klaviyo_L1: existing(10) },
    });

    await updateList(db, "L1");

    expect(doc("email-lists", "Klaviyo_L1")).toEqual({
      ...existing(10),
      name: "Renamed",
      lastFetchedAt: t2,
    });
  });

  it("appends a snapshot when the count changed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t2);
    fetchMock.mockResolvedValueOnce(listResponse("Old name", 12));
    const { db, doc } = fakeFirestore({
      "email-lists": { Klaviyo_L1: existing(10) },
    });

    await updateList(db, "L1");

    expect(doc("email-lists", "Klaviyo_L1")?.snapshots).toEqual([
      { count: 10, fetchedAt: t1 },
      { count: 12, fetchedAt: t2 },
    ]);
  });

  it("requests the list with profile_count and an encoded ID", async () => {
    fetchMock.mockResolvedValueOnce(listResponse("Newsletter", 1));
    const { db } = fakeFirestore();

    await updateList(db, "a/b c");

    const url = requestedUrl(0);
    expect(url.pathname).toBe("/api/lists/a%2Fb%20c");
    expect(url.searchParams.get("additional-fields[list]")).toBe(
      "profile_count",
    );
    expect(url.searchParams.get("fields[list]")).toBe("name,profile_count");
  });

  it("writes nothing when Klaviyo fails", async () => {
    fetchMock.mockResolvedValueOnce(json({ errors: [] }, 404));
    const { db, doc } = fakeFirestore();

    await expect(updateList(db, "L1")).rejects.toBeInstanceOf(KlaviyoApiError);
    expect(doc("email-lists", "Klaviyo_L1")).toBeUndefined();
  });

  it("reads stored Timestamps as dates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t2);
    fetchMock.mockResolvedValueOnce(listResponse("Old name", 10));
    const stored = {
      ...existing(10),
      lastFetchedAt: Timestamp.fromDate(t1),
      snapshots: [{ count: 10, fetchedAt: Timestamp.fromDate(t1) }],
    };
    const written: unknown[] = [];
    const ref = {};
    const db = {
      collection: () => ({ doc: () => ref }),
      runTransaction: (fn: (tx: unknown) => Promise<void>): Promise<void> =>
        fn({
          get: () => Promise.resolve({ exists: true, data: () => stored }),
          set: (_ref: unknown, data: unknown) => written.push(data),
        }),
    } as unknown as Firestore;

    await updateList(db, "L1");

    expect(written).toEqual([
      {
        ...existing(10),
        lastFetchedAt: t2,
        snapshots: [{ count: 10, fetchedAt: t1 }],
      },
    ]);
  });
});
