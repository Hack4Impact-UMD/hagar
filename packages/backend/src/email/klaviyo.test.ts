import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import {
  getAllCampaigns,
  getAllLists,
  updateCampaigns,
  updateList,
} from "@backend/email/klaviyo.ts";
import { logger } from "firebase-functions/logger";
import { KlaviyoApiError } from "@backend/email/klaviyoApi.ts";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "pk_test_secret" }),
}));

vi.mock("firebase-functions/logger", () => ({
  logger: {
    info: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
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

type Call = { url: URL; init: RequestInit | undefined };

/**
 * Routes fetch by method and pathname to queued responses, since one
 * `updateCampaigns` call makes many requests. Unrouted requests fail loudly.
 */
function routeFetch() {
  const queues = new Map<string, Response[]>();
  const calls: Call[] = [];
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    const response = queues.get(key)?.shift();
    if (!response) {
      return Promise.reject(new Error(`Unexpected request: ${key}`));
    }
    return Promise.resolve(response);
  });
  return {
    calls,
    on(method: string, pathname: string, ...responses: Response[]) {
      queues.set(`${method} ${pathname}`, responses);
    },
    to: (method: string, pathname: string) =>
      calls.filter(
        (c) =>
          (c.init?.method ?? "GET") === method && c.url.pathname === pathname,
      ),
  };
}

describe("getAllCampaigns", () => {
  it("filters by channel, paginates, and keeps only sent campaigns", async () => {
    const klaviyo = routeFetch();
    klaviyo.on(
      "GET",
      "/api/campaigns",
      json({
        data: [
          { id: "a", attributes: { status: "Sent" } },
          { id: "b", attributes: { status: "Draft" } },
        ],
        links: {
          next: "https://a.klaviyo.com/api/campaigns?page%5Bcursor%5D=2",
        },
      }),
      json({
        data: [
          { id: "c", attributes: { status: "Variations Sent" } },
          { id: "d", attributes: { status: "Cancelled" } },
          { id: "e", attributes: { status: "Scheduled" } },
        ],
      }),
    );

    await expect(getAllCampaigns()).resolves.toEqual(["a", "c"]);
    const params = klaviyo.calls[0]?.url.searchParams;
    expect(params?.get("filter")).toBe("equals(messages.channel,'email')");
    expect(params?.get("fields[campaign]")).toBe("status");
  });
});

describe("updateCampaigns", () => {
  const sendTime = "2026-03-01T12:00:00.000Z";
  const campaignHtml = "<p>Thanks for reading.</p>";
  const zeroStats = {
    recipients: 0,
    bounced: 0,
    opens_unique: 0,
    clicks_unique: 0,
    unsubscribe_uniques: 0,
    spam_complaints: 0,
  };

  /** Seeds `email-lists` so these IDs resolve without a segment lookup. */
  const knownLists = (...ids: string[]) => ({
    "email-lists": Object.fromEntries(ids.map((id) => [`Klaviyo_${id}`, {}])),
  });

  function campaign(id: string, overrides: Record<string, unknown> = {}) {
    return {
      type: "campaign",
      id,
      attributes: {
        name: `Campaign ${id}`,
        status: "Sent",
        send_time: sendTime,
        audiences: { included: ["L1"], excluded: [] },
        ...overrides,
      },
      relationships: {
        "campaign-messages": {
          data: [{ type: "campaign-message", id: `M${id}` }],
        },
      },
    };
  }

  function message(id: string, channel = "email") {
    return {
      type: "campaign-message",
      id,
      attributes: { definition: { channel } },
    };
  }

  function row(id: string, stats: Partial<typeof zeroStats>) {
    return {
      groupings: {
        campaign_id: id,
        campaign_message_id: `M${id}`,
        send_channel: "email",
      },
      statistics: { ...zeroStats, ...stats },
    };
  }

  /** Routes the details, metric, and report requests for a batch. */
  function setup(
    campaigns: unknown[],
    rows: unknown[],
    metrics = [{ id: "MET1", attributes: { name: "Opened Email" } }],
  ) {
    const klaviyo = routeFetch();
    klaviyo.on(
      "GET",
      "/api/campaigns",
      json({
        data: campaigns,
        included: (campaigns as { id: string }[]).map((c) =>
          message(`M${c.id}`),
        ),
      }),
    );
    klaviyo.on("GET", "/api/metrics", json({ data: metrics }));
    klaviyo.on(
      "POST",
      "/api/campaign-values-reports",
      json({ data: { attributes: { results: rows } } }),
    );
    return klaviyo;
  }

  function routeHtml(
    klaviyo: ReturnType<typeof routeFetch>,
    id: string,
    html: string | null = campaignHtml,
  ) {
    klaviyo.on(
      "GET",
      `/api/campaign-messages/M${id}/template`,
      json({ data: { attributes: { html } } }),
    );
  }

  const existingRecord = (overrides: Record<string, unknown> = {}) => ({
    platform: "Klaviyo",
    platformCampaignID: "C1",
    listIDs: ["OLD"],
    name: "Old name",
    content: campaignHtml,
    sentAt: new Date(sendTime),
    sent: 5,
    lastFetchedAt: t1,
    notes: "",
    snapshots: [
      {
        fetchedAt: t1,
        bounced: 0,
        uniqOpens: 2,
        uniqClicks: 1,
        unsubscribers: 0,
        complaints: 0,
      },
    ],
    ...overrides,
  });

  it.each([
    ["no IDs", []],
    ["more than 100 IDs", Array.from({ length: 101 }, (_, i) => `C${i}`)],
    ["an ID with illegal characters", ["C1", "x'),any(id,['y"]],
  ])("rejects %s before any request", async (_name, ids) => {
    const { db } = fakeFirestore(knownLists("L1"));

    await expect(updateCampaigns(db, ids)).rejects.toThrow(/campaign ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the details, metric, and one report request", async () => {
    const klaviyo = setup([campaign("C1"), campaign("C2")], []);
    const { db } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1", "C2", "C1"]);

    const details = klaviyo.to("GET", "/api/campaigns");
    expect(details).toHaveLength(1);
    const params = details[0]?.url.searchParams;
    expect(params?.get("filter")).toBe(
      "and(equals(messages.channel,'email'),any(id,['C1','C2']))",
    );
    expect(params?.get("include")).toBe("campaign-messages");
    expect(params?.get("fields[campaign]")).toBe("name,send_time,audiences");
    expect(params?.get("fields[campaign-message]")).toBe("definition.channel");
    expect(klaviyo.to("GET", "/api/metrics")).toHaveLength(1);

    const reports = klaviyo.to("POST", "/api/campaign-values-reports");
    expect(reports).toHaveLength(1);
    expect(JSON.parse(String(reports[0]?.init?.body))).toEqual({
      data: {
        type: "campaign-values-report",
        attributes: {
          statistics: [
            "recipients",
            "bounced",
            "opens_unique",
            "clicks_unique",
            "unsubscribe_uniques",
            "spam_complaints",
          ],
          timeframe: { key: "last_365_days" },
          conversion_metric_id: "MET1",
          filter:
            'and(contains-any(campaign_id,["C1","C2"]),equals(send_channel,"email"))',
        },
      },
    });
  });

  it("creates a new campaign with its HTML and one snapshot", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t2);
    const klaviyo = setup(
      [campaign("C1")],
      [
        row("C1", {
          recipients: 3,
          bounced: 1,
          opens_unique: 2,
          clicks_unique: 1,
          unsubscribe_uniques: 1,
          spam_complaints: 1,
        }),
      ],
    );
    routeHtml(klaviyo, "C1");
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1"]);

    const template = klaviyo.to(
      "GET",
      "/api/campaign-messages/MC1/template",
    )[0];
    expect(template?.url.searchParams.get("fields[template]")).toBe("html");
    expect(doc("email-campaigns", "Klaviyo_C1")).toEqual({
      platform: "Klaviyo",
      platformCampaignID: "C1",
      listIDs: ["L1"],
      name: "Campaign C1",
      content: campaignHtml,
      sentAt: new Date(sendTime),
      sent: 3,
      lastFetchedAt: t2,
      notes: "",
      snapshots: [
        {
          fetchedAt: t2,
          bounced: 1,
          uniqOpens: 2,
          uniqClicks: 1,
          unsubscribers: 1,
          complaints: 1,
        },
      ],
    });
  });

  it("sums the report rows of one campaign", async () => {
    const klaviyo = setup(
      [campaign("C1")],
      [
        row("C1", { recipients: 3, opens_unique: 1 }),
        row("C1", { recipients: 4, opens_unique: 2, clicks_unique: 1 }),
      ],
    );
    routeHtml(klaviyo, "C1");
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1"]);

    const record = doc("email-campaigns", "Klaviyo_C1");
    expect(record?.sent).toBe(7);
    expect(record?.snapshots).toMatchObject([{ uniqOpens: 3, uniqClicks: 1 }]);
  });

  it("writes nothing for a new campaign without stats", async () => {
    const klaviyo = setup([campaign("C1")], []);
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1"]);

    expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
    expect(klaviyo.to("GET", "/api/campaign-messages/MC1/template")).toEqual(
      [],
    );
  });

  it("writes nothing for a new campaign without HTML", async () => {
    const klaviyo = setup([campaign("C1")], [row("C1", { recipients: 3 })]);
    routeHtml(klaviyo, "C1", null);
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1"]);

    expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
  });

  it("skips a campaign Klaviyo returns without a send time", async () => {
    const klaviyo = setup(
      [campaign("C1", { send_time: null })],
      [row("C1", { recipients: 3 })],
    );
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await updateCampaigns(db, ["C1"]);

    expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipping Klaviyo campaign without a send time",
      { campaignID: "C1" },
    );
    expect(klaviyo.to("POST", "/api/campaign-values-reports")).toEqual([]);
  });

  it("does not look up segments for a new campaign without HTML", async () => {
    const klaviyo = setup(
      [
        campaign("C1", {
          audiences: { included: ["S1"], excluded: [] },
        }),
      ],
      [row("C1", { recipients: 3 })],
    );
    routeHtml(klaviyo, "C1", "   ");
    const { db, doc } = fakeFirestore();

    await updateCampaigns(db, ["C1"]);

    expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
    expect(klaviyo.to("GET", "/api/segments/S1")).toEqual([]);
  });

  describe("stats report window", () => {
    const longAgo = "2024-01-01T00:00:00.000Z";

    it("leaves campaigns older than a year out of the report", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(t2);
      const klaviyo = setup(
        [campaign("C1"), campaign("C2", { send_time: longAgo })],
        [row("C1", { recipients: 3 })],
      );
      routeHtml(klaviyo, "C1");
      const old = existingRecord({
        platformCampaignID: "C2",
        sentAt: new Date(longAgo),
      });
      const { db, doc } = fakeFirestore({
        ...knownLists("L1"),
        "email-campaigns": { Klaviyo_C2: old },
      });

      await updateCampaigns(db, ["C1", "C2"]);

      const [report] = klaviyo.to("POST", "/api/campaign-values-reports");
      expect(
        JSON.parse(String(report?.init?.body)).data.attributes.filter,
      ).toBe(
        'and(contains-any(campaign_id,["C1"]),equals(send_channel,"email"))',
      );
      expect(doc("email-campaigns", "Klaviyo_C1")?.sent).toBe(3);
      expect(doc("email-campaigns", "Klaviyo_C2")).toEqual({
        ...old,
        lastFetchedAt: t2,
      });
    });

    it("skips the metric lookup and report when every campaign is too old", async () => {
      const klaviyo = setup([campaign("C1", { send_time: longAgo })], []);
      const { db, doc } = fakeFirestore(knownLists("L1"));

      await updateCampaigns(db, ["C1"]);

      expect(klaviyo.to("GET", "/api/metrics")).toEqual([]);
      expect(klaviyo.to("POST", "/api/campaign-values-reports")).toEqual([]);
      expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
    });
  });

  describe("existing campaign", () => {
    const sameStats = { recipients: 9, opens_unique: 2, clicks_unique: 1 };

    it("adds no snapshot when the stats are unchanged", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(t2);
      const klaviyo = setup([campaign("C1")], [row("C1", sameStats)]);
      const { db, doc } = fakeFirestore({
        ...knownLists("L1"),
        "email-campaigns": { Klaviyo_C1: existingRecord() },
      });

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toEqual(
        existingRecord({
          name: "Campaign C1",
          listIDs: ["L1"],
          sent: 9,
          lastFetchedAt: t2,
        }),
      );
      expect(klaviyo.to("GET", "/api/campaign-messages/MC1/template")).toEqual(
        [],
      );
    });

    it("appends a snapshot when the stats changed", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(t2);
      setup([campaign("C1")], [row("C1", { ...sameStats, opens_unique: 4 })]);
      const { db, doc } = fakeFirestore({
        ...knownLists("L1"),
        "email-campaigns": { Klaviyo_C1: existingRecord() },
      });

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")?.snapshots).toEqual([
        existingRecord().snapshots[0],
        {
          fetchedAt: t2,
          bounced: 0,
          uniqOpens: 4,
          uniqClicks: 1,
          unsubscribers: 0,
          complaints: 0,
        },
      ]);
    });

    it("only advances lastFetchedAt when there are no stats", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(t2);
      setup([campaign("C1")], []);
      const { db, doc } = fakeFirestore({
        ...knownLists("L1"),
        "email-campaigns": { Klaviyo_C1: existingRecord() },
      });

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toEqual(
        existingRecord({ lastFetchedAt: t2 }),
      );
    });
  });

  it("writes the other campaigns when one fails, then names the failure", async () => {
    const klaviyo = setup(
      [campaign("C1"), campaign("C2")],
      [row("C1", { recipients: 3 }), row("C2", { recipients: 4 })],
    );
    klaviyo.on(
      "GET",
      "/api/campaign-messages/MC1/template",
      json({ errors: [] }, 403),
    );
    routeHtml(klaviyo, "C2");
    const { db, doc } = fakeFirestore(knownLists("L1"));

    await expect(updateCampaigns(db, ["C1", "C2"])).rejects.toThrow(/C1/);

    expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
    expect(doc("email-campaigns", "Klaviyo_C2")?.sent).toBe(4);
  });

  it("fails clearly when the Opened Email metric is missing", async () => {
    const klaviyo = setup(
      [campaign("C1")],
      [],
      [{ id: "X", attributes: { name: "Placed Order" } }],
    );
    const { db } = fakeFirestore(knownLists("L1"));

    await expect(updateCampaigns(db, ["C1"])).rejects.toThrow(/Opened Email/);
    expect(klaviyo.to("POST", "/api/campaign-values-reports")).toEqual([]);
  });

  describe("audience resolution", () => {
    const segmentNotes = (...names: string[]) =>
      `Sent to recipients in the following audience segments:\n\n${names.join("\n")}`;

    function segment(name: string, conditions: unknown[][]) {
      return json({
        data: {
          type: "segment",
          attributes: {
            name,
            definition: {
              condition_groups: conditions.map((group) => ({
                conditions: group,
              })),
            },
          },
        },
      });
    }

    const membership = (isMember: boolean, ...groupIDs: string[]) => ({
      type: "profile-group-membership",
      is_member: isMember,
      group_ids: groupIDs,
      timeframe_filter: null,
    });

    const audience = (...included: string[]) => ({
      audiences: { included, excluded: ["IGNORED"] },
    });

    /** One campaign with stats and HTML, ready to be created. */
    function setupOne(included: string[], id = "C1") {
      const klaviyo = setup(
        [campaign(id, audience(...included))],
        [row(id, { recipients: 3 })],
      );
      routeHtml(klaviyo, id);
      return klaviyo;
    }

    it("keeps a known list without asking for a segment", async () => {
      const klaviyo = setupOne(["L1"]);
      const { db, doc } = fakeFirestore(knownLists("L1"));

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: ["L1"],
        notes: "",
      });
      expect(klaviyo.to("GET", "/api/segments/L1")).toEqual([]);
    });

    it("treats an ID that is not a segment as an unsynced list", async () => {
      const klaviyo = setupOne(["NEWLIST"]);
      klaviyo.on("GET", "/api/segments/NEWLIST", json({ errors: [] }, 404));
      const { db, doc } = fakeFirestore();

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: ["NEWLIST"],
        notes: "",
      });
      const request = klaviyo.to("GET", "/api/segments/NEWLIST")[0];
      expect(request?.url.searchParams.get("fields[segment]")).toBe(
        "name,definition",
      );
    });

    it("takes known lists from a segment's membership rules", async () => {
      const klaviyo = setupOne(["SEG1"]);
      klaviyo.on(
        "GET",
        "/api/segments/SEG1",
        segment("Engaged (60 Days)", [
          [membership(true, "L1")],
          [
            { type: "profile-metric", metric_id: "M", measurement: "count" },
            membership(true, "L2", "UNKNOWN", "SEG2"),
            membership(false, "L3"),
          ],
        ]),
      );
      const { db, doc } = fakeFirestore(knownLists("L1", "L2", "L3"));

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: ["L1", "L2"],
        notes: segmentNotes("Engaged (60 Days)"),
      });
      expect(klaviyo.to("GET", "/api/segments/SEG2")).toEqual([]);
      expect(klaviyo.to("GET", "/api/segments/UNKNOWN")).toEqual([]);
    });

    it("lists every segment name and deduplicates lists in order", async () => {
      const klaviyo = setupOne(["L2", "SEG1", "SEG2", "L1"]);
      klaviyo.on(
        "GET",
        "/api/segments/SEG1",
        segment("First", [[membership(true, "L1", "L2")]]),
      );
      klaviyo.on(
        "GET",
        "/api/segments/SEG2",
        segment("Second", [[membership(true, "L1")]]),
      );
      const { db, doc } = fakeFirestore(knownLists("L1", "L2"));

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: ["L2", "L1"],
        notes: segmentNotes("First", "Second"),
      });
    });

    it("treats a segment without a definition as having no rules", async () => {
      const klaviyo = setupOne(["SEG1"]);
      klaviyo.on(
        "GET",
        "/api/segments/SEG1",
        json({ data: { attributes: { name: "Empty", definition: null } } }),
      );
      const { db, doc } = fakeFirestore();

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: [],
        notes: segmentNotes("Empty"),
      });
    });

    it("looks up a segment shared by two campaigns once", async () => {
      const klaviyo = setup(
        [campaign("C1", audience("SEG1")), campaign("C2", audience("SEG1"))],
        [row("C1", { recipients: 3 }), row("C2", { recipients: 4 })],
      );
      routeHtml(klaviyo, "C1");
      routeHtml(klaviyo, "C2");
      klaviyo.on(
        "GET",
        "/api/segments/SEG1",
        segment("Shared", [[membership(true, "L1")]]),
      );
      const { db, doc } = fakeFirestore(knownLists("L1"));

      await updateCampaigns(db, ["C1", "C2"]);

      expect(klaviyo.to("GET", "/api/segments/SEG1")).toHaveLength(1);
      for (const id of ["C1", "C2"]) {
        expect(doc("email-campaigns", `Klaviyo_${id}`)).toMatchObject({
          listIDs: ["L1"],
          notes: segmentNotes("Shared"),
        });
      }
    });

    it("fails only the campaign whose segment lookup errors", async () => {
      const klaviyo = setup(
        [campaign("C1", audience("SEG1")), campaign("C2", audience("L1"))],
        [row("C1", { recipients: 3 }), row("C2", { recipients: 4 })],
      );
      routeHtml(klaviyo, "C1");
      routeHtml(klaviyo, "C2");
      klaviyo.on("GET", "/api/segments/SEG1", json({ errors: [] }, 403));
      const { db, doc } = fakeFirestore(knownLists("L1"));

      await expect(updateCampaigns(db, ["C1", "C2"])).rejects.toThrow(/C1/);

      expect(doc("email-campaigns", "Klaviyo_C1")).toBeUndefined();
      expect(doc("email-campaigns", "Klaviyo_C2")?.listIDs).toEqual(["L1"]);
    });

    it("refreshes the lists and notes of an existing campaign", async () => {
      const klaviyo = setup(
        [campaign("C1", audience("SEG1"))],
        [row("C1", { recipients: 5, opens_unique: 2, clicks_unique: 1 })],
      );
      klaviyo.on(
        "GET",
        "/api/segments/SEG1",
        segment("Engaged", [[membership(true, "L2")]]),
      );
      const { db, doc } = fakeFirestore({
        ...knownLists("L2"),
        "email-campaigns": {
          Klaviyo_C1: existingRecord({ notes: "stale" }),
        },
      });

      await updateCampaigns(db, ["C1"]);

      expect(doc("email-campaigns", "Klaviyo_C1")).toMatchObject({
        listIDs: ["L2"],
        notes: segmentNotes("Engaged"),
      });
    });
  });
});
