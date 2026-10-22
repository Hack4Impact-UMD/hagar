import type { ActiveUserProfile, StoredCampaign } from "@repo/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  addLinkedItem,
  addUtmCode,
  campaignNotFound,
  getCampaign,
  listCampaigns,
  removeLinkedItem,
  removeUtmCode,
  setCampaignNotes,
  toCampaign,
} from "@backend/services/campaigns.ts";

const NOW = "2024-06-01T00:00:00.000Z";

function campaign(
  changes: Partial<StoredCampaign> & Pick<StoredCampaign, "updatedAt">,
): StoredCampaign {
  return {
    name: "Spring launch",
    notes: "Targets returning donors",
    utmCodes: ["spring_launch"],
    linkedItems: [{ type: "EMAIL", id: "email-1" }],
    ...changes,
  };
}

// Listed oldest first, so `updatedAt` follows this order.
const CAMPAIGNS: Record<string, StoredCampaign> = {
  oldest: campaign({
    name: "Winter appeal",
    updatedAt: "2024-01-01T00:00:00.000Z",
    utmCodes: [],
    linkedItems: [],
  }),
  middle: campaign({ updatedAt: "2024-03-01T00:00:00.000Z" }),
  newest: campaign({
    name: "Summer drive",
    updatedAt: "2024-05-01T00:00:00.000Z",
    utmCodes: ["summer", "summer_email"],
    linkedItems: [
      { type: "EMAIL", id: "email-1" },
      { type: "EMAIL", id: "email-2" },
    ],
  }),
};

function seeded() {
  return fakeFirestore({
    campaigns: CAMPAIGNS,
    // Linking only needs the linked item to exist.
    "email-campaigns": { "email-1": {}, "email-2": {}, "email-3": {} },
  });
}

/** The profile the middleware would hand the service. */
function actor(role: ActiveUserProfile["role"]): ActiveUserProfile {
  return {
    uid: `${role}-1`,
    email: "ada@example.com",
    role,
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "ACTIVE",
    photoPath: "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
    phoneNumber: "+15555550100",
    firstName: "Ada",
    lastName: "Lovelace",
    region: "US",
  };
}

const admin = actor("Local Admin");

/** The campaign a procedure should return for `id` after a change. */
function campaignOf(id: string, changes: Partial<StoredCampaign> = {}) {
  return { campaignId: id, ...CAMPAIGNS[id], ...changes };
}

/** Pins the clock so a test can see which `updatedAt` a change wrote. */
function freezeTime() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("toCampaign", () => {
  it("adds the id and drops stray fields", () => {
    expect(toCampaign("middle", { ...CAMPAIGNS.middle, legacy: "x" })).toEqual(
      campaignOf("middle"),
    );
  });

  it("throws on a document that is not a campaign", () => {
    expect(() => toCampaign("middle", { name: "No other fields" })).toThrow(
      /utmCodes/,
    );
  });
});

describe("campaignNotFound", () => {
  it("is a NOT_FOUND error", () => {
    expect(campaignNotFound()).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listCampaigns", () => {
  it.fails("lists every campaign, most recently updated first", async () => {
    const { db } = seeded();

    const campaigns = await listCampaigns(db, admin);

    expect(campaigns).toEqual([
      campaignOf("newest"),
      campaignOf("middle"),
      campaignOf("oldest"),
    ]);
  });

  it.fails("lists campaigns for a Viewer too", async () => {
    const { db } = seeded();

    const campaigns = await listCampaigns(db, actor("Viewer"));

    expect(campaigns.map((c) => c.campaignId)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it.fails("returns an empty list when there are no campaigns", async () => {
    const { db } = fakeFirestore();

    await expect(listCampaigns(db, admin)).resolves.toEqual([]);
  });
});

describe("getCampaign", () => {
  it.fails("returns the campaign with its id", async () => {
    const { db } = seeded();

    await expect(
      getCampaign(db, admin, { campaignId: "middle" }),
    ).resolves.toEqual(campaignOf("middle"));
  });

  it.fails("returns a campaign to a Viewer", async () => {
    const { db } = seeded();

    await expect(
      getCampaign(db, actor("Viewer"), { campaignId: "middle" }),
    ).resolves.toEqual(campaignOf("middle"));
  });

  it.fails("throws NOT_FOUND for an unknown campaign", async () => {
    const { db } = seeded();

    await expect(
      getCampaign(db, admin, { campaignId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("setCampaignNotes", () => {
  it.fails("replaces the notes and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await setCampaignNotes(db, admin, {
      campaignId: "middle",
      notes: "Moved to June",
    });

    const expected = campaignOf("middle", {
      notes: "Moved to June",
      updatedAt: NOW,
    });
    expect(updated).toEqual(expected);
    expect(doc("campaigns", "middle")).toEqual({
      ...CAMPAIGNS.middle,
      notes: "Moved to June",
      updatedAt: NOW,
    });
  });

  it.fails("leaves every other campaign untouched", async () => {
    const { db, doc } = seeded();

    await setCampaignNotes(db, admin, { campaignId: "middle", notes: "New" });

    expect(doc("campaigns", "newest")).toEqual(CAMPAIGNS.newest);
    expect(doc("campaigns", "oldest")).toEqual(CAMPAIGNS.oldest);
  });

  it.fails("clears the notes when given an empty string", async () => {
    const { db } = seeded();

    const updated = await setCampaignNotes(db, admin, {
      campaignId: "middle",
      notes: "",
    });

    expect(updated.notes).toBe("");
  });

  it.fails("lets a Global Admin edit too", async () => {
    const { db } = seeded();

    const updated = await setCampaignNotes(db, actor("Global Admin"), {
      campaignId: "middle",
      notes: "Hello",
    });

    expect(updated.notes).toBe("Hello");
  });

  it.fails("throws NOT_FOUND for an unknown campaign, creating nothing", async () => {
    const { db, doc } = seeded();

    await expect(
      setCampaignNotes(db, admin, { campaignId: "missing", notes: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("campaigns", "missing")).toBeUndefined();
  });
});

describe("addLinkedItem", () => {
  it.fails("appends the link and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await addLinkedItem(db, admin, {
      campaignId: "middle",
      item: { type: "EMAIL", id: "email-2" },
    });

    const linkedItems: StoredCampaign["linkedItems"] = [
      { type: "EMAIL", id: "email-1" },
      { type: "EMAIL", id: "email-2" },
    ];
    expect(updated).toEqual(
      campaignOf("middle", { linkedItems, updatedAt: NOW }),
    );
    expect(doc("campaigns", "middle")).toMatchObject({ linkedItems });
  });

  it.fails("links a campaign that had no links", async () => {
    const { db } = seeded();

    const updated = await addLinkedItem(db, admin, {
      campaignId: "oldest",
      item: { type: "EMAIL", id: "email-3" },
    });

    expect(updated.linkedItems).toEqual([{ type: "EMAIL", id: "email-3" }]);
  });

  it.fails("changes nothing when the link already exists", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await addLinkedItem(db, admin, {
      campaignId: "middle",
      item: { type: "EMAIL", id: "email-1" },
    });

    expect(updated).toEqual(campaignOf("middle"));
    expect(doc("campaigns", "middle")).toEqual(CAMPAIGNS.middle);
  });

  it.fails("throws NOT_FOUND when the linked item does not exist", async () => {
    const { db, doc } = seeded();

    await expect(
      addLinkedItem(db, admin, {
        campaignId: "middle",
        item: { type: "EMAIL", id: "no-such-email" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("campaigns", "middle")).toEqual(CAMPAIGNS.middle);
  });

  it.fails("throws NOT_FOUND for an unknown campaign", async () => {
    const { db } = seeded();

    await expect(
      addLinkedItem(db, admin, {
        campaignId: "missing",
        item: { type: "EMAIL", id: "email-1" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("removeLinkedItem", () => {
  it.fails("removes only the matching link and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await removeLinkedItem(db, admin, {
      campaignId: "newest",
      item: { type: "EMAIL", id: "email-1" },
    });

    const linkedItems: StoredCampaign["linkedItems"] = [
      { type: "EMAIL", id: "email-2" },
    ];
    expect(updated).toEqual(
      campaignOf("newest", { linkedItems, updatedAt: NOW }),
    );
    expect(doc("campaigns", "newest")).toMatchObject({ linkedItems });
  });

  it.fails("changes nothing when the campaign does not have the link", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await removeLinkedItem(db, admin, {
      campaignId: "middle",
      item: { type: "EMAIL", id: "email-2" },
    });

    expect(updated).toEqual(campaignOf("middle"));
    expect(doc("campaigns", "middle")).toEqual(CAMPAIGNS.middle);
  });

  it.fails("removes a link whose item no longer exists", async () => {
    const { db } = fakeFirestore({ campaigns: CAMPAIGNS });

    const updated = await removeLinkedItem(db, admin, {
      campaignId: "middle",
      item: { type: "EMAIL", id: "email-1" },
    });

    expect(updated.linkedItems).toEqual([]);
  });

  it.fails("throws NOT_FOUND for an unknown campaign", async () => {
    const { db } = seeded();

    await expect(
      removeLinkedItem(db, admin, {
        campaignId: "missing",
        item: { type: "EMAIL", id: "email-1" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("addUtmCode", () => {
  it.fails("appends the code and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await addUtmCode(db, admin, {
      campaignId: "middle",
      utmCode: "spring_launch_social",
    });

    const utmCodes = ["spring_launch", "spring_launch_social"];
    expect(updated).toEqual(campaignOf("middle", { utmCodes, updatedAt: NOW }));
    expect(doc("campaigns", "middle")).toMatchObject({ utmCodes });
  });

  it.fails("adds a code to a campaign that had none", async () => {
    const { db } = seeded();

    const updated = await addUtmCode(db, admin, {
      campaignId: "oldest",
      utmCode: "winter",
    });

    expect(updated.utmCodes).toEqual(["winter"]);
  });

  it.fails("changes nothing when the code already exists", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await addUtmCode(db, admin, {
      campaignId: "middle",
      utmCode: "spring_launch",
    });

    expect(updated).toEqual(campaignOf("middle"));
    expect(doc("campaigns", "middle")).toEqual(CAMPAIGNS.middle);
  });

  it.fails("treats a code that differs only in case as a different code", async () => {
    const { db } = seeded();

    const updated = await addUtmCode(db, admin, {
      campaignId: "middle",
      utmCode: "Spring_Launch",
    });

    expect(updated.utmCodes).toEqual(["spring_launch", "Spring_Launch"]);
  });

  it.fails("throws NOT_FOUND for an unknown campaign", async () => {
    const { db } = seeded();

    await expect(
      addUtmCode(db, admin, { campaignId: "missing", utmCode: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("removeUtmCode", () => {
  it.fails("removes only the matching code and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await removeUtmCode(db, admin, {
      campaignId: "newest",
      utmCode: "summer",
    });

    const utmCodes = ["summer_email"];
    expect(updated).toEqual(campaignOf("newest", { utmCodes, updatedAt: NOW }));
    expect(doc("campaigns", "newest")).toMatchObject({ utmCodes });
  });

  it.fails("changes nothing when the campaign does not have the code", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await removeUtmCode(db, admin, {
      campaignId: "middle",
      utmCode: "summer",
    });

    expect(updated).toEqual(campaignOf("middle"));
    expect(doc("campaigns", "middle")).toEqual(CAMPAIGNS.middle);
  });

  it.fails("matches the code exactly, including case", async () => {
    const { db } = seeded();

    const updated = await removeUtmCode(db, admin, {
      campaignId: "middle",
      utmCode: "SPRING_LAUNCH",
    });

    expect(updated.utmCodes).toEqual(["spring_launch"]);
  });

  it.fails("throws NOT_FOUND for an unknown campaign", async () => {
    const { db } = seeded();

    await expect(
      removeUtmCode(db, admin, { campaignId: "missing", utmCode: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
