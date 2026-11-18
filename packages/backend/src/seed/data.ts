import {
  EmailList,
  StoredEmailCampaignRecord,
  ownProfilePhotoPath,
  reportFilePath,
  storedCampaign,
  storedReport,
  storedUserProfile,
  storedView,
} from "@repo/common";
import type {
  ChartDefinition,
  EmailCampaignMetric,
  EmailPlatform,
  PointInTime,
  StoredCampaign,
  StoredReport,
  StoredUserProfile,
  StoredView,
  UserRegion,
  UserRole,
} from "@repo/common";
import type { Rgb } from "@backend/seed/assets.ts";

/**
 * Seeded Auth users and the documents they own start with this, which is how
 * `--clean` tells them from real people.
 */
export const SEED_PREFIX = "seed-";
export const SEED_PASSWORD = "password";

/** Written by the email platform syncs rather than by any procedure. */
export const EMAIL_LISTS_COLLECTION = "email-lists";

/**
 * Each region syncs from one platform. Campaigns carry a region and lists do
 * not, so this decides every campaign's platform and which platforms the
 * lists are spread across.
 */
const PLATFORM_BY_REGION = {
  US: "Virtuous",
  Canada: "Virtuous",
  Australia: "MailChimp",
  "New Zealand": "MailChimp",
} as const satisfies Record<UserRegion, EmailPlatform>;

export type SeedUser = {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  profile: StoredUserProfile;
  /** The colour of the avatar file to upload, or `null` when there is none. */
  avatar: Rgb | null;
};

export type SeedEmailCampaign = {
  id: string;
  record: StoredEmailCampaignRecord;
  /** The HTML to upload at `record.contentPath`. */
  html: string;
};

export type SeedReport = {
  id: string;
  record: StoredReport;
  /** The text shown in the placeholder PDF uploaded at `record.path`. */
  pdfTitle: string;
};

export type SeedData = {
  users: SeedUser[];
  emailLists: { id: string; record: EmailList }[];
  emailCampaigns: SeedEmailCampaign[];
  campaigns: { id: string; record: StoredCampaign }[];
  views: { id: string; record: StoredView }[];
  reports: SeedReport[];
};

/** Deterministic, so every run produces the same numbers. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

function uidOf(slug: string): string {
  return `${SEED_PREFIX}${slug}`;
}

type UserSpec = {
  slug: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  region: UserRegion;
  stage:
    | "PROFILE SETUP"
    | "EMAIL VERIFICATION"
    | "AWAITING APPROVAL"
    | "ACTIVE";
  avatar: Rgb | null;
};

// One account per role and onboarding stage, with every region represented, so
// each view of the app has someone to sign in as.
const USER_SPECS: UserSpec[] = [
  {
    slug: "global-admin",
    firstName: "Grace",
    lastName: "Okafor",
    role: "Global Admin",
    region: "US",
    stage: "ACTIVE",
    avatar: [198, 40, 40],
  },
  {
    slug: "local-admin-us",
    firstName: "Marcus",
    lastName: "Bell",
    role: "Local Admin",
    region: "US",
    stage: "ACTIVE",
    avatar: [21, 101, 192],
  },
  {
    slug: "local-admin-au",
    firstName: "Mia",
    lastName: "Thompson",
    role: "Local Admin",
    region: "Australia",
    stage: "ACTIVE",
    avatar: [46, 125, 50],
  },
  {
    slug: "viewer-us",
    firstName: "Daniel",
    lastName: "Reyes",
    role: "Viewer",
    region: "US",
    stage: "ACTIVE",
    avatar: [106, 27, 154],
  },
  {
    slug: "viewer-ca",
    firstName: "Chloe",
    lastName: "Tremblay",
    role: "Viewer",
    region: "Canada",
    stage: "ACTIVE",
    avatar: [239, 108, 0],
  },
  {
    slug: "viewer-au",
    firstName: "Jack",
    lastName: "Nguyen",
    role: "Viewer",
    region: "Australia",
    stage: "ACTIVE",
    avatar: [0, 131, 143],
  },
  {
    slug: "viewer-nz",
    firstName: "Aroha",
    lastName: "Walker",
    role: "Viewer",
    region: "New Zealand",
    stage: "ACTIVE",
    avatar: [173, 20, 87],
  },
  {
    slug: "awaiting-approval",
    firstName: "Priya",
    lastName: "Patel",
    role: "Viewer",
    region: "Canada",
    stage: "AWAITING APPROVAL",
    avatar: [93, 64, 55],
  },
  {
    slug: "email-verification",
    firstName: "Tom",
    lastName: "Fischer",
    role: "Viewer",
    region: "US",
    stage: "EMAIL VERIFICATION",
    avatar: [84, 110, 122],
  },
  {
    slug: "profile-setup",
    firstName: "",
    lastName: "",
    role: "Viewer",
    region: "US",
    stage: "PROFILE SETUP",
    avatar: null,
  },
];

function buildUsers(now: Date): SeedUser[] {
  return USER_SPECS.map((spec, index) => {
    const uid = uidOf(spec.slug);
    const base = {
      email: `${uid}@example.com`,
      role: spec.role,
      createdAt: daysAgo(now, 90 - index * 5),
    };

    if (spec.stage === "PROFILE SETUP") {
      return {
        uid,
        email: base.email,
        displayName: null,
        emailVerified: false,
        profile: storedUserProfile.assert({
          ...base,
          stage: spec.stage,
          photoPath: null,
          phoneNumber: null,
          firstName: null,
          lastName: null,
          region: null,
        }),
        avatar: null,
      };
    }

    return {
      uid,
      email: base.email,
      displayName: `${spec.firstName} ${spec.lastName}`,
      // Only the stage before this one is waiting on the verification link.
      emailVerified: spec.stage !== "EMAIL VERIFICATION",
      profile: storedUserProfile.assert({
        ...base,
        stage: spec.stage,
        photoPath: ownProfilePhotoPath(uid),
        phoneNumber: `+1 555 01${String(index).padStart(2, "0")}`,
        firstName: spec.firstName,
        lastName: spec.lastName,
        region: spec.region,
      }),
      avatar: spec.avatar,
    };
  });
}

const WEEKS_OF_LIST_HISTORY = 12;

type ListSpec = {
  slug: string;
  platform: EmailPlatform;
  platformListID: string;
  name: string;
  startingCount: number;
  maxWeeklyGrowth: number;
};

const LIST_SPECS: ListSpec[] = [
  {
    slug: "mc-newsletter",
    platform: "MailChimp",
    platformListID: "a1b2c3d4e5",
    name: "Newsletter Subscribers (AU/NZ)",
    startingCount: 4200,
    maxWeeklyGrowth: 60,
  },
  {
    slug: "mc-donors",
    platform: "MailChimp",
    platformListID: "f6a7b8c9d0",
    name: "Monthly Donors (AU/NZ)",
    startingCount: 850,
    maxWeeklyGrowth: 15,
  },
  {
    slug: "virtuous-major-donors",
    platform: "Virtuous",
    platformListID: "3101",
    name: "Major Donors (US/CA)",
    startingCount: 320,
    maxWeeklyGrowth: 8,
  },
  {
    slug: "virtuous-volunteers",
    platform: "Virtuous",
    platformListID: "3102",
    name: "Volunteers (US/CA)",
    startingCount: 1900,
    maxWeeklyGrowth: 35,
  },
];

function buildLists(now: Date, random: () => number) {
  return LIST_SPECS.map((spec) => {
    let count = spec.startingCount;
    // Always growing, because the Virtuous sync only records a snapshot when
    // the count changes.
    const snapshots = Array.from({ length: WEEKS_OF_LIST_HISTORY }, (_, i) => {
      count += 1 + Math.floor(random() * spec.maxWeeklyGrowth);
      const weeksBack = WEEKS_OF_LIST_HISTORY - 1 - i;
      return { count, fetchedAt: daysAgo(now, weeksBack * 7) };
    });
    return {
      id: `${SEED_PREFIX}list-${spec.slug}`,
      record: EmailList.assert({
        platform: spec.platform,
        platformListID: spec.platformListID,
        name: spec.name,
        lastFetchedAt: snapshots.at(-1)?.fetchedAt,
        snapshots,
      }),
    };
  });
}

// How much of its final numbers a campaign had reached when checked this many
// days after it was sent.
const SNAPSHOT_CURVE = [
  { daysAfterSend: 1, share: 0.5 },
  { daysAfterSend: 3, share: 0.8 },
  { daysAfterSend: 7, share: 0.95 },
  { daysAfterSend: 14, share: 1 },
];

function mailchimpSnapshots(
  now: Date,
  random: () => number,
  sentDaysAgo: number,
  sent: number,
) {
  const final = {
    bounced: sent * (0.005 + random() * 0.015),
    uniqOpens: sent * (0.3 + random() * 0.15),
    uniqClicks: sent * (0.02 + random() * 0.04),
    unsubscribers: sent * (0.001 + random() * 0.004),
    complaints: sent * random() * 0.0005,
  };
  return SNAPSHOT_CURVE.filter(
    ({ daysAfterSend }) => daysAfterSend <= sentDaysAgo,
  ).map(({ daysAfterSend, share }) => ({
    fetchedAt: daysAgo(now, sentDaysAgo - daysAfterSend),
    bounced: Math.round(final.bounced * share),
    uniqOpens: Math.round(final.uniqOpens * share),
    uniqClicks: Math.round(final.uniqClicks * share),
    unsubscribers: Math.round(final.unsubscribers * share),
    complaints: Math.round(final.complaints * share),
  }));
}

type EmailSpec = {
  slug: string;
  name: string;
  region: UserRegion;
  /** Days before now the email went out. Mailchimp only; Virtuous reports no send time. */
  sentDaysAgo: number;
};

const EMAIL_SPECS: EmailSpec[] = [
  {
    slug: "au-march",
    name: "March Newsletter",
    region: "Australia",
    sentDaysAgo: 50,
  },
  {
    slug: "au-winter",
    name: "Winter Appeal",
    region: "Australia",
    sentDaysAgo: 28,
  },
  {
    slug: "au-thanks",
    name: "Volunteer Thank You",
    region: "Australia",
    sentDaysAgo: 9,
  },
  {
    slug: "nz-kia-ora",
    name: "Kia Ora Newsletter",
    region: "New Zealand",
    sentDaysAgo: 45,
  },
  {
    slug: "nz-matariki",
    name: "Matariki Giving Drive",
    region: "New Zealand",
    sentDaysAgo: 21,
  },
  {
    slug: "nz-impact",
    name: "Impact Report Announcement",
    region: "New Zealand",
    sentDaysAgo: 3,
  },
  {
    slug: "us-year-end",
    name: "Year-End Giving Appeal",
    region: "US",
    sentDaysAgo: 0,
  },
  { slug: "us-gala", name: "Gala Invitation", region: "US", sentDaysAgo: 0 },
  {
    slug: "ca-canada-day",
    name: "Canada Day Fundraiser",
    region: "Canada",
    sentDaysAgo: 0,
  },
  {
    slug: "ca-welcome",
    name: "Monthly Donor Welcome",
    region: "Canada",
    sentDaysAgo: 0,
  },
];

/** Every platform's email HTML lives under this folder in Cloud Storage. */
export const EMAIL_CONTENT_FOLDER = "email-content/";

function emailHtml(name: string): string {
  return `<!doctype html><html><body><h1>${name}</h1><p>Seeded demo email.</p></body></html>`;
}

function buildEmailCampaigns(
  now: Date,
  random: () => number,
): SeedEmailCampaign[] {
  const mailchimpListIds = LIST_SPECS.filter(
    (list) => list.platform === "MailChimp",
  ).map((list) => list.platformListID);

  return EMAIL_SPECS.map((spec, index) => {
    const id = `${SEED_PREFIX}email-${spec.slug}`;
    const platform = PLATFORM_BY_REGION[spec.region];
    const platformCampaignID =
      platform === "Virtuous" ? String(5001 + index) : `mc-${spec.slug}`;

    const contentPath = `${EMAIL_CONTENT_FOLDER}${platform.toLowerCase()}/${platformCampaignID}.html`;

    if (platform === "Virtuous") {
      return {
        id,
        // Virtuous reports no send time, counts, stats or list membership.
        record: StoredEmailCampaignRecord.assert({
          platform,
          region: spec.region,
          platformCampaignID,
          listIDs: [],
          name: spec.name,
          contentPath,
          lastFetchedAt: now.toISOString(),
          notes: "",
          snapshots: [],
        }),
        html: emailHtml(spec.name),
      };
    }

    const sent = 2000 + Math.floor(random() * 7000);
    const snapshots = mailchimpSnapshots(now, random, spec.sentDaysAgo, sent);
    return {
      id,
      record: StoredEmailCampaignRecord.assert({
        platform,
        region: spec.region,
        platformCampaignID,
        listIDs: [mailchimpListIds[index % mailchimpListIds.length]],
        name: spec.name,
        contentPath,
        sentAt: daysAgo(now, spec.sentDaysAgo),
        sent,
        lastFetchedAt: snapshots.at(-1)?.fetchedAt,
        notes: "",
        snapshots,
      }),
      html: emailHtml(spec.name),
    };
  });
}

type CampaignSpec = {
  slug: string;
  name: string;
  region: UserRegion;
  notes: string;
  utmCodes: string[];
  emails: string[];
  updatedDaysAgo: number;
};

const CAMPAIGN_SPECS: CampaignSpec[] = [
  {
    slug: "year-end-us",
    name: "Year-End Giving 2026",
    region: "US",
    notes: "Primary US fundraising push for the end of the year.",
    utmCodes: ["yeg26_email", "yeg26_social"],
    emails: ["us-year-end", "us-gala"],
    updatedDaysAgo: 2,
  },
  {
    slug: "canada-summer",
    name: "Canada Summer Drive",
    region: "Canada",
    notes: "Tied to the Canada Day weekend.",
    utmCodes: ["cad_summer"],
    emails: ["ca-canada-day", "ca-welcome"],
    updatedDaysAgo: 6,
  },
  {
    slug: "au-winter",
    name: "Australia Winter Appeal",
    region: "Australia",
    notes: "",
    utmCodes: ["au_winter_email"],
    emails: ["au-winter", "au-thanks"],
    updatedDaysAgo: 12,
  },
  {
    slug: "au-newsletter",
    name: "Australia Newsletter Series",
    region: "Australia",
    notes: "Monthly newsletter, run by the regional team.",
    utmCodes: [],
    emails: ["au-march"],
    updatedDaysAgo: 30,
  },
  {
    slug: "nz-matariki",
    name: "Matariki Giving Drive",
    region: "New Zealand",
    notes: "Runs around the Matariki holiday.",
    utmCodes: ["nz_matariki", "nz_matariki_fb"],
    emails: ["nz-matariki", "nz-kia-ora", "nz-impact"],
    updatedDaysAgo: 4,
  },
];

function buildCampaigns(now: Date, emailCampaigns: SeedEmailCampaign[]) {
  return CAMPAIGN_SPECS.map((spec) => ({
    id: `${SEED_PREFIX}campaign-${spec.slug}`,
    record: storedCampaign.assert({
      name: spec.name,
      region: spec.region,
      notes: spec.notes,
      updatedAt: daysAgo(now, spec.updatedDaysAgo),
      utmCodes: spec.utmCodes,
      linkedItems: spec.emails.map((slug) => {
        const email = emailCampaigns.find(
          (candidate) => candidate.id === `${SEED_PREFIX}email-${slug}`,
        );
        if (!email) throw new Error(`No seeded email ${slug}`);
        return { type: "EMAIL" as const, id: email.id };
      }),
    }),
  }));
}

const NOW_POINT: PointInTime = { type: "RELATIVE", anchor: "NOW" };

function weeksAgo(amount: number): PointInTime {
  return { type: "RELATIVE", anchor: "NOW", ago: { amount, unit: "WEEK" } };
}

function listSize(name: string, slug: string): ChartDefinition {
  return {
    name,
    chartId: "EMAIL_LIST_SIZE",
    params: {
      emailListId: `${SEED_PREFIX}list-${slug}`,
      pointInTime: NOW_POINT,
    },
  };
}

function listGrowth(
  name: string,
  slug: string,
  weeks: number,
): ChartDefinition {
  return {
    name,
    chartId: "EMAIL_LIST_SIZE_OVER_TIME",
    params: {
      emailListId: `${SEED_PREFIX}list-${slug}`,
      start: weeksAgo(weeks),
      end: NOW_POINT,
    },
  };
}

function emailMetric(
  name: string,
  slug: string,
  metric: EmailCampaignMetric,
): ChartDefinition {
  return {
    name,
    chartId: "EMAIL_CAMPAIGN_METRIC",
    params: {
      emailCampaignId: `${SEED_PREFIX}email-${slug}`,
      metric,
      pointInTime: NOW_POINT,
    },
  };
}

function emailMetricOverTime(
  name: string,
  slug: string,
  metric: EmailCampaignMetric,
  weeks: number,
): ChartDefinition {
  return {
    name,
    chartId: "EMAIL_CAMPAIGN_METRIC_OVER_TIME",
    params: {
      emailCampaignId: `${SEED_PREFIX}email-${slug}`,
      metric,
      start: weeksAgo(weeks),
      end: NOW_POINT,
    },
  };
}

type ViewSpec = {
  slug: string;
  name: string;
  author: string;
  shareOption: StoredView["shareOption"];
  charts: ChartDefinition[];
  updatedDaysAgo: number;
};

// Virtuous campaigns report no stats, so only Mailchimp ones get metric charts.
const VIEW_SPECS: ViewSpec[] = [
  {
    slug: "donor-growth",
    name: "Donor growth",
    author: "global-admin",
    shareOption: "ANYONE_VIEW",
    charts: [
      listSize("Monthly donors today", "mc-donors"),
      listSize("Major donors today", "virtuous-major-donors"),
      listGrowth("Monthly donors, last quarter", "mc-donors", 11),
      listGrowth("Major donors, last quarter", "virtuous-major-donors", 11),
    ],
    updatedDaysAgo: 3,
  },
  {
    slug: "au-newsletter",
    name: "Australia newsletter performance",
    author: "local-admin-au",
    shareOption: "ANYONE_EDIT",
    charts: [
      emailMetric("Winter Appeal opens", "au-winter", "uniqOpens"),
      emailMetric("Winter Appeal clicks", "au-winter", "uniqClicks"),
      emailMetricOverTime(
        "Winter Appeal opens over time",
        "au-winter",
        "uniqOpens",
        4,
      ),
      listGrowth("Newsletter subscribers", "mc-newsletter", 11),
    ],
    updatedDaysAgo: 5,
  },
  {
    slug: "nz-health",
    name: "NZ campaign health",
    author: "viewer-nz",
    shareOption: "PRIVATE",
    charts: [
      emailMetric("Matariki bounces", "nz-matariki", "bounced"),
      emailMetric("Matariki unsubscribes", "nz-matariki", "unsubscribers"),
      emailMetric("Matariki complaints", "nz-matariki", "complaints"),
    ],
    updatedDaysAgo: 8,
  },
  {
    slug: "volunteers",
    name: "Volunteer pipeline",
    author: "local-admin-us",
    shareOption: "ANYONE_VIEW",
    charts: [
      listSize("Volunteers today", "virtuous-volunteers"),
      listGrowth("Volunteers over time", "virtuous-volunteers", 11),
    ],
    updatedDaysAgo: 1,
  },
  {
    slug: "executive-overview",
    name: "Executive overview",
    author: "global-admin",
    shareOption: "PRIVATE",
    charts: [
      listSize("Newsletter subscribers", "mc-newsletter"),
      listSize("Volunteers", "virtuous-volunteers"),
      emailMetric("Kia Ora opens", "nz-kia-ora", "uniqOpens"),
      emailMetricOverTime(
        "Matariki clicks over time",
        "nz-matariki",
        "uniqClicks",
        3,
      ),
    ],
    updatedDaysAgo: 10,
  },
  {
    slug: "q-review",
    name: "Quarterly review",
    author: "viewer-au",
    shareOption: "ANYONE_VIEW",
    charts: [
      listGrowth("Monthly donors", "mc-donors", 11),
      emailMetric("March newsletter opens", "au-march", "uniqOpens"),
    ],
    updatedDaysAgo: 14,
  },
];

function buildViews(now: Date) {
  return VIEW_SPECS.map((spec) => ({
    id: `${SEED_PREFIX}view-${spec.slug}`,
    record: storedView.assert({
      name: spec.name,
      authorUid: uidOf(spec.author),
      shareOption: spec.shareOption,
      charts: spec.charts,
      updatedAt: daysAgo(now, spec.updatedDaysAgo),
    }),
  }));
}

// Report ids are also file names, which must be UUIDs, so unlike the other
// seeded ids they can't carry the seed prefix.
const REPORT_SPECS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    view: "donor-growth",
    takenDaysAgo: 2,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    view: "au-newsletter",
    takenDaysAgo: 4,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    view: "executive-overview",
    takenDaysAgo: 9,
  },
];

function buildReports(
  now: Date,
  views: { id: string; record: StoredView }[],
): SeedReport[] {
  return REPORT_SPECS.map((spec) => {
    const view = views.find(
      (candidate) => candidate.id === `${SEED_PREFIX}view-${spec.view}`,
    );
    if (!view) throw new Error(`No seeded view ${spec.view}`);
    return {
      id: spec.id,
      pdfTitle: view.record.name,
      record: storedReport.assert({
        viewId: view.id,
        // A report keeps the charts as they were when it was taken.
        charts: view.record.charts,
        takenAt: daysAgo(now, spec.takenDaysAgo),
        notes: "",
        path: reportFilePath(view.id, spec.id),
        requesterUid: view.record.authorUid,
      }),
    };
  });
}

/**
 * Everything to seed, validated against the shared schemas. Dates count back
 * from `now`, so charts always have recent data.
 */
export function buildSeedData(now: Date): SeedData {
  const random = createRandom(20260101);

  const emailCampaigns = buildEmailCampaigns(now, random);
  const views = buildViews(now);
  return {
    users: buildUsers(now),
    emailLists: buildLists(now, random),
    emailCampaigns,
    campaigns: buildCampaigns(now, emailCampaigns),
    views,
    reports: buildReports(now, views),
  };
}
