import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";

const details = {
  photoPath: "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
  region: "US" as const,
};

// Keyed by uid. The middleware reads these through the mocked service below.
const profiles: Record<string, object> = {
  "awaiting-1": { ...details, stage: "AWAITING APPROVAL", role: "Viewer" },
  "viewer-1": { ...details, stage: "ACTIVE", role: "Viewer" },
  "admin-1": { ...details, stage: "ACTIVE", role: "Local Admin" },
};

// The procedures delegate to this service, which has its own tests.
vi.mock("@backend/services/users.ts", () => ({
  getOrCreateUserProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
  findUserProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve(
      session.uid in profiles
        ? { uid: session.uid, ...profiles[session.uid] }
        : null,
    ),
  completeProfile: (_db: unknown, session: { uid: string }) =>
    Promise.resolve({ uid: session.uid }),
  updateProfile: (_db: unknown, profile: { uid: string }) =>
    Promise.resolve({ uid: profile.uid }),
}));

// Each returns the caller it was handed, to show the middleware passed it on.
vi.mock("@backend/services/userManagement.ts", () => {
  const echoActor = (_db: unknown, actor: { uid: string }) =>
    Promise.resolve({ actor: actor.uid });
  return {
    listUsers: echoActor,
    approveUser: echoActor,
    setUserRole: echoActor,
    setUserRegion: echoActor,
    deleteUser: echoActor,
  };
});

// Same idea: each returns the caller it was handed.
vi.mock("@backend/services/campaigns.ts", () => {
  const echoActor = (_db: unknown, actor: { uid: string }) =>
    Promise.resolve({ actor: actor.uid });
  return {
    listCampaigns: echoActor,
    getCampaign: echoActor,
    setCampaignNotes: echoActor,
    addLinkedItem: echoActor,
    removeLinkedItem: echoActor,
    addUtmCode: echoActor,
    removeUtmCode: echoActor,
  };
});

vi.mock("@backend/services/views.ts", () => {
  const echoActor = (_db: unknown, actor: { uid: string }) =>
    Promise.resolve({ actor: actor.uid });
  return {
    listViews: echoActor,
    getView: echoActor,
    createView: echoActor,
    copyView: echoActor,
    updateView: echoActor,
    setViewShareOption: echoActor,
  };
});

vi.mock("@backend/services/reports.ts", () => {
  const echoActor = (_db: unknown, actor: { uid: string }) =>
    Promise.resolve({ actor: actor.uid });
  return {
    listReports: echoActor,
    getReport: echoActor,
    createReport: echoActor,
  };
});

/**
 * Procedures are called directly, so these tests need no emulator and no
 * HTTP. Copy this pattern when you add a procedure.
 */
function caller(session: Context["session"]) {
  // The only Firestore caller, the users service, is mocked above.
  const db = undefined as unknown as Firestore;
  return createCaller({ session, db });
}

function signedInAs(uid: string) {
  return caller({ uid, email: `${uid}@example.com`, emailVerified: true });
}

const anonymous = caller(null);
const signedIn = signedInAs("user-1");
const awaiting = signedInAs("awaiting-1");
const viewer = signedInAs("viewer-1");
const admin = signedInAs("admin-1");

type Caller = ReturnType<typeof caller>;

const campaignId = "campaign-1";
const NOW_ISO = "2024-06-01T00:00:00.000Z";
const item = { type: "EMAIL", id: "email-1" } as const;

const viewId = "view-1";

// Any approved user, Viewers included.
const readCalls = [
  (as: Caller) => as.campaigns.list(),
  (as: Caller) => as.campaigns.get({ campaignId }),
  (as: Caller) => as.views.list(),
  (as: Caller) => as.views.get({ viewId }),
];

// Any approved user, Viewers included. Which views they may change is decided
// per view in the service, so a Viewer still can't edit anyone else's.
const viewWriteCalls = [
  (as: Caller) => as.views.create({ name: "Q3 overview" }),
  (as: Caller) => as.views.copy({ viewId }),
  (as: Caller) => as.views.update({ viewId, name: "Renamed" }),
  (as: Caller) =>
    as.views.setShareOption({ viewId, shareOption: "ANYONE_VIEW" }),
];

const reportId = "123e4567-e89b-42d3-a456-426614174000";

// Any approved user, Viewers included. Which reports they can see is decided
// per report in the service, from its view.
const reportCalls = [
  (as: Caller) => as.reports.list(),
  (as: Caller) => as.reports.list({ viewId }),
  (as: Caller) => as.reports.get({ reportId }),
  (as: Caller) =>
    as.reports.create({ viewId, reportId, notes: "For the board" }),
];

// Approved users who are not Viewers.
const editCalls = [
  (as: Caller) => as.campaigns.setNotes({ campaignId, notes: "New notes" }),
  (as: Caller) => as.campaigns.addLinkedItem({ campaignId, item }),
  (as: Caller) => as.campaigns.removeLinkedItem({ campaignId, item }),
  (as: Caller) => as.campaigns.addUtmCode({ campaignId, utmCode: "spring" }),
  (as: Caller) => as.campaigns.removeUtmCode({ campaignId, utmCode: "spring" }),
];

const activeCalls = [
  (as: Caller) => as.users.updateProfile({ firstName: "Grace" }),
  ...readCalls,
  ...viewWriteCalls,
  ...reportCalls,
  ...editCalls,
];

const adminCalls = [
  (as: Caller) => as.users.list({ stage: "AWAITING APPROVAL" }),
  (as: Caller) => as.users.approve({ uid: "other" }),
  (as: Caller) => as.users.setRole({ uid: "other", role: "Viewer" }),
  (as: Caller) => as.users.setRegion({ uid: "other", region: "Canada" }),
  (as: Caller) => as.users.delete({ uid: "other" }),
];

describe("appRouter", () => {
  it("rejects every procedure without a token", async () => {
    for (const call of [
      () => anonymous.me(),
      () => anonymous.users.completeProfile(details),
      ...[...activeCalls, ...adminCalls].map((call) => () => call(anonymous)),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("passes the session to a protected procedure", async () => {
    await expect(signedIn.me()).resolves.toMatchObject({ uid: "user-1" });
  });

  it("validates profile details with the shared arktype schema", async () => {
    await expect(
      signedIn.users.completeProfile({ ...details, firstName: "" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      viewer.users.updateProfile({ firstName: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects active and admin procedures for users who are not approved", async () => {
    for (const as of [signedIn, awaiting]) {
      for (const call of [...activeCalls, ...adminCalls]) {
        await expect(call(as)).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
    }
  });

  it("passes the profile to an active procedure", async () => {
    await expect(
      viewer.users.updateProfile({ firstName: "Grace" }),
    ).resolves.toMatchObject({ uid: "viewer-1" });
  });

  it("rejects admin procedures for a Viewer", async () => {
    for (const call of adminCalls) {
      await expect(call(viewer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("passes the admin's profile to the user management services", async () => {
    for (const call of adminCalls) {
      await expect(call(admin)).resolves.toEqual({ actor: "admin-1" });
    }
  });

  it("lets a Viewer read campaigns, passing their profile on", async () => {
    for (const call of readCalls) {
      await expect(call(viewer)).resolves.toEqual({ actor: "viewer-1" });
    }
  });

  it("lets a Viewer create and manage views, passing their profile on", async () => {
    for (const call of viewWriteCalls) {
      await expect(call(viewer)).resolves.toEqual({ actor: "viewer-1" });
    }
  });

  it("lets a Viewer list, get and create reports, passing their profile on", async () => {
    for (const call of reportCalls) {
      await expect(call(viewer)).resolves.toEqual({ actor: "viewer-1" });
    }
  });

  it("validates report inputs with the shared arktype schemas", async () => {
    await expect(admin.reports.get({ reportId: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(admin.reports.list({ viewId: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    // The report id is the name of the uploaded file, so it must be a UUID.
    await expect(
      admin.reports.create({ viewId, reportId: "report-1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects undeclared keys on report inputs so a report can't be forged", async () => {
    await expect(
      admin.reports.create({
        viewId,
        reportId,
        charts: [],
        takenAt: NOW_ISO,
      } as { viewId: string; reportId: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.reports.list({ viewId, extra: 1 } as { viewId: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects campaign edits from a Viewer", async () => {
    for (const call of editCalls) {
      await expect(call(viewer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("lets an admin edit campaigns, passing their profile on", async () => {
    for (const call of editCalls) {
      await expect(call(admin)).resolves.toEqual({ actor: "admin-1" });
    }
  });

  it("validates campaign inputs with the shared arktype schemas", async () => {
    await expect(admin.campaigns.get({ campaignId: "" })).rejects.toMatchObject(
      { code: "BAD_REQUEST" },
    );
    await expect(
      admin.campaigns.addUtmCode({ campaignId, utmCode: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.campaigns.addLinkedItem({
        campaignId,
        item: { type: "SMS", id: "sms-1" } as unknown as typeof item,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates view inputs with the shared arktype schemas", async () => {
    await expect(admin.views.get({ viewId: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(admin.views.copy({ viewId: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(admin.views.create({ name: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    // An update must change something.
    await expect(admin.views.update({ viewId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      admin.views.setShareOption({
        viewId,
        shareOption: "PUBLIC" as "PRIVATE",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects undeclared keys on view inputs so callers cannot set the author", async () => {
    await expect(
      admin.views.create({
        name: "Q3 overview",
        authorUid: "someone-else",
      } as { name: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.views.update({
        viewId,
        name: "x",
        updatedAt: NOW_ISO,
      } as { viewId: string; name: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.views.create({
        name: "Q3 overview",
        charts: [{ name: "Open rate", extra: true } as { name: string }],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects undeclared keys on campaign inputs", async () => {
    await expect(
      admin.campaigns.setNotes({
        campaignId,
        notes: "x",
        updatedAt: NOW_ISO,
      } as { campaignId: string; notes: string }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.campaigns.addLinkedItem({
        campaignId,
        item: { ...item, extra: true } as typeof item,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects undeclared keys so callers cannot set fields like role", async () => {
    await expect(
      signedIn.users.completeProfile({
        ...details,
        role: "Global Admin",
      } as typeof details),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      viewer.users.updateProfile({ role: "Global Admin" } as object),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
