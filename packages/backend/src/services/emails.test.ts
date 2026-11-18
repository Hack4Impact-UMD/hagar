import type {
  ActiveUserProfile,
  EmailCampaignSummary,
  EmailListSummary,
} from "@repo/common";
import { describe, expect, it } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  listEmailCampaigns,
  listEmailLists,
} from "@backend/services/emails.ts";

const fetchedAt = "2024-06-01T00:00:00.000Z";
const snapshots = [
  {
    fetchedAt,
    bounced: 1,
    uniqOpens: 2,
    uniqClicks: 3,
    unsubscribers: 4,
    complaints: 5,
  },
];

/** A stored email. Leave out `sentAt` for one whose platform didn't report it. */
function email(
  summary: Omit<EmailCampaignSummary, "emailCampaignId" | "sentAt"> & {
    sentAt?: string;
  },
) {
  return {
    ...summary,
    platformCampaignID: `platform-${summary.name}`,
    listIDs: ["list-1"],
    content: "https://example.com/campaign",
    sent: 1200,
    lastFetchedAt: fetchedAt,
    notes: "Internal notes",
    snapshots,
  };
}

const SENT = {
  march: "2024-03-01T09:00:00.000Z",
  april: "2024-04-01T09:00:00.000Z",
  may: "2024-05-01T09:00:00.000Z",
};

const EMAILS = {
  march: email({
    name: "March newsletter",
    region: "US",
    platform: "Klaviyo",
    sentAt: SENT.march,
  }),
  april: email({
    name: "April appeal",
    region: "Canada",
    platform: "MailChimp",
    sentAt: SENT.april,
  }),
  may: email({
    name: "May update",
    region: "US",
    platform: "Campaign_Monitor",
    sentAt: SENT.may,
  }),
  unsent: email({ name: "No send time", region: "US", platform: "Klaviyo" }),
};

const LISTS = {
  volunteers: {
    platform: "Klaviyo",
    platformListID: "k-volunteers",
    name: "Volunteers",
    lastFetchedAt: fetchedAt,
    snapshots: [{ count: 50, fetchedAt }],
  },
  donors: {
    platform: "MailChimp",
    platformListID: "m-donors",
    name: "Donors",
    lastFetchedAt: fetchedAt,
    snapshots: [{ count: 900, fetchedAt }],
  },
  alumni: {
    platform: "Campaign_Monitor",
    platformListID: "cm-alumni",
    name: "Alumni",
    lastFetchedAt: fetchedAt,
    snapshots: [{ count: 300, fetchedAt }],
  },
};

function seeded() {
  return fakeFirestore({ "email-campaigns": EMAILS, "email-lists": LISTS });
}

/** The profile the middleware would hand the service. */
function actor(role: ActiveUserProfile["role"]): ActiveUserProfile {
  return {
    uid: `${role}-1`,
    email: "ada@example.com",
    role,
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "ACTIVE",
    photoPath: "profile-photos/user-1/avatar",
    phoneNumber: "+15555550100",
    firstName: "Ada",
    lastName: "Lovelace",
    region: "US",
  };
}

const admin = actor("Local Admin");

/** What `emails.campaigns` should return for a dated email. */
function summaryOf(id: keyof typeof SENT): EmailCampaignSummary {
  const { name, region, platform } = EMAILS[id];
  return { emailCampaignId: id, name, region, platform, sentAt: SENT[id] };
}

describe("listEmailCampaigns", () => {
  it.fails("lists only the summary of each email sent in the range, bounds included, newest first", async () => {
    const { db } = seeded();

    const emails = await listEmailCampaigns(db, admin, {
      sentFrom: SENT.march,
      sentTo: SENT.april,
    });

    expect(emails).toEqual([summaryOf("april"), summaryOf("march")]);
  });

  it.fails("lists every email sent up to the end when there is no start", async () => {
    const { db } = seeded();

    const emails = await listEmailCampaigns(db, admin, {
      sentTo: SENT.april,
    });

    expect(emails).toEqual([summaryOf("april"), summaryOf("march")]);
  });

  it.fails("leaves out emails with no send time", async () => {
    const { db } = seeded();

    const emails = await listEmailCampaigns(db, admin, { sentTo: fetchedAt });

    expect(emails.map((e) => e.emailCampaignId)).toEqual([
      "may",
      "april",
      "march",
    ]);
  });

  it.fails("lists emails for a Viewer too", async () => {
    const { db } = seeded();

    const emails = await listEmailCampaigns(db, actor("Viewer"), {
      sentTo: fetchedAt,
    });

    expect(emails).toHaveLength(3);
  });

  it.fails("returns an empty list when nothing was sent in the range", async () => {
    const { db } = seeded();

    await expect(
      listEmailCampaigns(db, admin, { sentTo: "2024-01-01T00:00:00.000Z" }),
    ).resolves.toEqual([]);
  });
});

describe("listEmailLists", () => {
  it.fails("lists only the summary of every list, sorted by name", async () => {
    const { db } = seeded();

    const lists = await listEmailLists(db, admin);

    expect(lists).toEqual<EmailListSummary[]>([
      { emailListId: "alumni", name: "Alumni", platform: "Campaign_Monitor" },
      { emailListId: "donors", name: "Donors", platform: "MailChimp" },
      { emailListId: "volunteers", name: "Volunteers", platform: "Klaviyo" },
    ]);
  });

  it.fails("lists email lists for a Viewer too", async () => {
    const { db } = seeded();

    await expect(listEmailLists(db, actor("Viewer"))).resolves.toHaveLength(3);
  });

  it.fails("returns an empty list when there are no lists", async () => {
    const { db } = fakeFirestore();

    await expect(listEmailLists(db, admin)).resolves.toEqual([]);
  });
});
