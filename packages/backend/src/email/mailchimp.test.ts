import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  getAllCampaigns,
  getAllLists,
  updateCampaign,
  updateList,
} from "@backend/email/mailchimp.ts";

const mocks = vi.hoisted(() => {
  const hasKey = Boolean(process.env.MAILCHIMP_API);
  process.env.MAILCHIMP_API ||= "missing";
  return {
    hasKey,
    db: undefined as unknown,
    saveHtml:
      vi.fn<(path: string, html: string, options: unknown) => Promise<void>>(),
  };
});

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mocks.db,
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: (path: string) => ({
        save: (html: string, options: unknown) =>
          mocks.saveHtml(path, html, options),
      }),
    }),
  }),
}));

vi.setConfig({ testTimeout: 60_000 });

beforeEach(() => {
  mocks.saveHtml.mockReset();
  mocks.saveHtml.mockImplementation(() => Promise.resolve());
});

function useFirestore() {
  const fake = fakeFirestore();
  mocks.db = fake.db;
  return fake;
}

async function firstListId() {
  const [id] = await getAllLists();
  if (id === undefined) throw new Error("The account has no lists.");
  return id;
}

describe.skipIf(!mocks.hasKey)("Mailchimp API", () => {
  describe("getAllLists", () => {
    it("returns the IDs of the account's lists", async () => {
      const ids = await getAllLists();

      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(id).toEqual(expect.any(String));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("getAllCampaigns", () => {
    it("returns the IDs of the account's campaigns", async () => {
      const ids = await getAllCampaigns();

      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(id).toEqual(expect.any(String));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("updateList", () => {
    it("stores the list with its first snapshot", async () => {
      const { doc } = useFirestore();
      const id = await firstListId();

      await updateList(id);

      expect(doc("email-lists", id)).toMatchObject({
        platform: "MailChimp",
        platformListID: id,
        name: expect.stringMatching(/.+/),
        lastFetchedAt: expect.any(Date),
        snapshots: [{ count: expect.any(Number), fetchedAt: expect.any(Date) }],
      });
    });

    it("does not add a snapshot when nothing changed", async () => {
      const { doc } = useFirestore();
      const id = await firstListId();

      await updateList(id);
      const first = doc("email-lists", id) as { lastFetchedAt: Date };
      await updateList(id);
      const second = doc("email-lists", id) as { lastFetchedAt: Date };

      expect(second).toMatchObject({ snapshots: [expect.anything()] });
      expect(second.lastFetchedAt.getTime()).toBeGreaterThanOrEqual(
        first.lastFetchedAt.getTime(),
      );
    });

    it("throws for a list that does not exist", async () => {
      useFirestore();

      await expect(updateList("not-a-real-list")).rejects.toThrow(
        /^Mailchimp 404/,
      );
    });
  });

  describe("updateCampaign", () => {
    async function storeFirstSentCampaign(
      doc: ReturnType<typeof useFirestore>["doc"],
    ) {
      const campaigns = await getAllCampaigns();
      for (const id of campaigns.slice(0, 20)) {
        await updateCampaign(id);
        if (doc("email-campaigns", id)) return id;
      }
      throw new Error("None of the first 20 campaigns has been sent.");
    }

    it("stores a sent campaign with its metrics and HTML", async () => {
      const { doc } = useFirestore();

      const id = await storeFirstSentCampaign(doc);

      expect(doc("email-campaigns", id)).toMatchObject({
        platform: "MailChimp",
        platformCampaignID: id,
        listIDs: [expect.any(String)],
        name: expect.any(String),
        content: expect.stringMatching(
          /^email-integrations\/mail-chimp\/.+\.html$/,
        ),
        sentAt: expect.any(Date),
        sent: expect.any(Number),
        notes: "",
        snapshots: [
          {
            bounced: expect.any(Number),
            uniqOpens: expect.any(Number),
            uniqClicks: expect.any(Number),
            unsubscribers: expect.any(Number),
            complaints: expect.any(Number),
          },
        ],
      });
      expect(mocks.saveHtml).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(/\.html$/),
        expect.stringContaining("<"),
        { contentType: "text/html; charset=utf-8" },
      );
    });

    it("does not save the HTML or add a snapshot on a second update", async () => {
      const { doc } = useFirestore();
      const id = await storeFirstSentCampaign(doc);
      mocks.saveHtml.mockClear();

      await updateCampaign(id);

      expect(mocks.saveHtml).not.toHaveBeenCalled();
      expect(doc("email-campaigns", id)).toMatchObject({
        snapshots: [expect.anything()],
      });
    });

    it("throws for a campaign that does not exist", async () => {
      useFirestore();

      await expect(updateCampaign("not-a-real-campaign")).rejects.toThrow(
        /^Mailchimp 404/,
      );
    });
  });
});
