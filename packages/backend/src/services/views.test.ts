import type { ActiveUserProfile, StoredView, UserRole } from "@repo/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  assertCanEditView,
  assertCanSeeView,
  assertCanShareView,
  copyView,
  createView,
  getView,
  listViews,
  setViewShareOption,
  toView,
  updateView,
  viewNotFound,
} from "@backend/services/views.ts";

const NOW = "2024-06-01T00:00:00.000Z";

function stored(
  authorUid: string,
  shareOption: StoredView["shareOption"],
  updatedAt: string,
): StoredView {
  return {
    name: `${authorUid}'s ${shareOption} view`,
    authorUid,
    shareOption,
    charts: [{ name: "Open rate" }],
    updatedAt,
  };
}

// Listed oldest first, so `updatedAt` follows this order.
const VIEWS: Record<string, StoredView> = {
  minePrivate: stored("owner", "PRIVATE", "2024-01-01T00:00:00.000Z"),
  mineShared: stored("owner", "ANYONE_VIEW", "2024-02-01T00:00:00.000Z"),
  theirsPrivate: stored("other", "PRIVATE", "2024-03-01T00:00:00.000Z"),
  theirsView: stored("other", "ANYONE_VIEW", "2024-04-01T00:00:00.000Z"),
  theirsEdit: stored("other", "ANYONE_EDIT", "2024-05-01T00:00:00.000Z"),
};

function seeded() {
  return fakeFirestore({ views: VIEWS });
}

/** The profile the middleware would hand the service. */
function actor(uid: string, role: UserRole = "Local Admin"): ActiveUserProfile {
  return {
    uid,
    email: `${uid}@example.com`,
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

const owner = actor("owner");
const other = actor("other");
const viewer = actor("viewer", "Viewer");
// The author of `minePrivate` and `mineShared`, after being made a Viewer.
const ownerAsViewer = actor("owner", "Viewer");
const globalAdmin = actor("global", "Global Admin");

/** The stored document seeded for `id`. */
function storedOf(id: string): StoredView {
  return VIEWS[id] as StoredView;
}

/** The view a procedure should return for `id` after a change. */
function viewOf(id: string, changes: Partial<StoredView> = {}) {
  return { viewId: id, ...VIEWS[id], ...changes };
}

/** Pins the clock so a test can see which `updatedAt` a change wrote. */
function freezeTime() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("toView", () => {
  it("adds the id and drops stray fields", () => {
    expect(toView("mineShared", { ...VIEWS.mineShared, legacy: "x" })).toEqual(
      viewOf("mineShared"),
    );
  });

  it("throws on a document that is not a view", () => {
    expect(() => toView("mineShared", { name: "Nothing else" })).toThrow(
      /authorUid/,
    );
  });
});

describe("viewNotFound", () => {
  it("is a NOT_FOUND error", () => {
    expect(viewNotFound()).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("view access checks", () => {
  it("hides a view the actor may not see as NOT_FOUND", () => {
    expect(() =>
      assertCanSeeView(owner, storedOf("minePrivate")),
    ).not.toThrow();
    expect(() => assertCanSeeView(owner, storedOf("theirsView"))).not.toThrow();
    expect(() => assertCanSeeView(owner, storedOf("theirsPrivate"))).toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  it("shows every view to a Global Admin", () => {
    expect(() =>
      assertCanSeeView(globalAdmin, storedOf("theirsPrivate")),
    ).not.toThrow();
  });

  it("refuses an edit the actor may not make as FORBIDDEN", () => {
    expect(() =>
      assertCanEditView(other, storedOf("theirsView")),
    ).not.toThrow();
    expect(() =>
      assertCanEditView(owner, storedOf("theirsEdit")),
    ).not.toThrow();
    expect(() => assertCanEditView(owner, storedOf("theirsView"))).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => assertCanEditView(viewer, storedOf("theirsEdit"))).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("lets a Viewer edit and share their own view", () => {
    expect(() =>
      assertCanEditView(ownerAsViewer, storedOf("minePrivate")),
    ).not.toThrow();
    expect(() =>
      assertCanShareView(ownerAsViewer, storedOf("minePrivate")),
    ).not.toThrow();
  });

  it("lets only the author change who a view is shared with", () => {
    expect(() =>
      assertCanShareView(other, storedOf("theirsEdit")),
    ).not.toThrow();
    expect(() => assertCanShareView(owner, storedOf("theirsEdit"))).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});

describe("listViews", () => {
  it.fails("lists the actor's own views and everyone's shared views, newest first", async () => {
    const { db } = seeded();

    const views = await listViews(db, owner);

    expect(views).toEqual([
      viewOf("theirsEdit"),
      viewOf("theirsView"),
      viewOf("mineShared"),
      viewOf("minePrivate"),
    ]);
  });

  it.fails("never lists another user's private view", async () => {
    const { db } = seeded();

    const views = await listViews(db, other);

    expect(views.map((v) => v.viewId)).toEqual([
      "theirsEdit",
      "theirsView",
      "theirsPrivate",
      "mineShared",
    ]);
  });

  it.fails("lists a shared view of the actor's own once, not twice", async () => {
    const { db } = seeded();

    const views = await listViews(db, owner);

    expect(views.filter((v) => v.viewId === "mineShared")).toHaveLength(1);
  });

  it.fails("lists only shared views for a Viewer", async () => {
    const { db } = seeded();

    const views = await listViews(db, viewer);

    expect(views.map((v) => v.viewId)).toEqual([
      "theirsEdit",
      "theirsView",
      "mineShared",
    ]);
  });

  it.fails("lists every view for a Global Admin, private ones included", async () => {
    const { db } = seeded();

    const views = await listViews(db, globalAdmin);

    expect(views.map((v) => v.viewId)).toEqual([
      "theirsEdit",
      "theirsView",
      "theirsPrivate",
      "mineShared",
      "minePrivate",
    ]);
  });

  it.fails("returns an empty list when there are no views", async () => {
    const { db } = fakeFirestore();

    await expect(listViews(db, owner)).resolves.toEqual([]);
  });
});

describe("getView", () => {
  it.fails("returns the author's own private view", async () => {
    const { db } = seeded();

    await expect(
      getView(db, owner, { viewId: "minePrivate" }),
    ).resolves.toEqual(viewOf("minePrivate"));
  });

  it.fails("returns a shared view to someone else", async () => {
    const { db } = seeded();

    for (const viewId of ["theirsView", "theirsEdit"]) {
      await expect(getView(db, owner, { viewId })).resolves.toEqual(
        viewOf(viewId),
      );
    }
  });

  it.fails("returns a shared view to a Viewer", async () => {
    const { db } = seeded();

    await expect(
      getView(db, viewer, { viewId: "theirsView" }),
    ).resolves.toEqual(viewOf("theirsView"));
  });

  it.fails("throws NOT_FOUND for someone else's private view", async () => {
    const { db } = seeded();

    await expect(
      getView(db, owner, { viewId: "theirsPrivate" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.fails("returns anyone's private view to a Global Admin", async () => {
    const { db } = seeded();

    await expect(
      getView(db, globalAdmin, { viewId: "minePrivate" }),
    ).resolves.toEqual(viewOf("minePrivate"));
  });

  it.fails("throws the same NOT_FOUND for an unknown view", async () => {
    const { db } = seeded();

    await expect(
      getView(db, owner, { viewId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createView", () => {
  it("creates a private, empty view owned by the actor", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const created = await createView(db, owner, { name: "Q3 overview" });

    const expected: StoredView = {
      name: "Q3 overview",
      authorUid: "owner",
      shareOption: "PRIVATE",
      charts: [],
      updatedAt: NOW,
    };
    expect(created).toEqual({ viewId: created.viewId, ...expected });
    expect(created.viewId).not.toBe("");
    expect(doc("views", created.viewId)).toEqual(expected);
  });

  it("uses the charts and share option it is given", async () => {
    const { db, doc } = seeded();

    const created = await createView(db, owner, {
      name: "Q3 overview",
      charts: [{ name: "Open rate" }, { name: "List growth" }],
      shareOption: "ANYONE_VIEW",
    });

    expect(created).toMatchObject({
      charts: [{ name: "Open rate" }, { name: "List growth" }],
      shareOption: "ANYONE_VIEW",
    });
    expect(doc("views", created.viewId)).toMatchObject({
      shareOption: "ANYONE_VIEW",
    });
  });

  it("gives each view its own id and leaves existing views alone", async () => {
    const { db, doc } = seeded();

    const first = await createView(db, owner, { name: "One" });
    const second = await createView(db, owner, { name: "Two" });

    expect(first.viewId).not.toBe(second.viewId);
    expect(doc("views", "minePrivate")).toEqual(VIEWS.minePrivate);
  });

  it("lets a Global Admin create a view", async () => {
    const { db } = seeded();

    const created = await createView(db, globalAdmin, { name: "Mine" });

    expect(created.authorUid).toBe("global");
  });

  it("lets a Viewer create a view of their own", async () => {
    const { db, doc } = seeded();

    const created = await createView(db, viewer, { name: "Mine" });

    expect(created).toMatchObject({
      authorUid: "viewer",
      shareOption: "PRIVATE",
    });
    expect(doc("views", created.viewId)).toMatchObject({ authorUid: "viewer" });
  });
});

describe("copyView", () => {
  it("copies a view the actor owns, as a new private view", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const copy = await copyView(db, owner, { viewId: "mineShared" });

    const expected: StoredView = {
      name: "Copy of owner's ANYONE_VIEW view",
      authorUid: "owner",
      shareOption: "PRIVATE",
      charts: storedOf("mineShared").charts,
      updatedAt: NOW,
    };
    expect(copy).toEqual({ viewId: copy.viewId, ...expected });
    expect(copy.viewId).not.toBe("mineShared");
    expect(doc("views", copy.viewId)).toEqual(expected);
  });

  it("makes the actor the author of a copy of someone else's view", async () => {
    const { db } = seeded();

    const copy = await copyView(db, owner, { viewId: "theirsEdit" });

    expect(copy).toMatchObject({
      authorUid: "owner",
      charts: storedOf("theirsEdit").charts,
    });
  });

  it("starts the copy private, whatever the original's share option", async () => {
    const { db } = seeded();

    for (const viewId of ["theirsView", "theirsEdit"]) {
      const copy = await copyView(db, owner, { viewId });
      expect(copy.shareOption).toBe("PRIVATE");
    }
  });

  it("leaves the original untouched, including its update time", async () => {
    const { db, doc } = seeded();

    await copyView(db, owner, { viewId: "theirsView" });

    expect(doc("views", "theirsView")).toEqual(VIEWS.theirsView);
  });

  it("copies any view to a Global Admin, private ones included", async () => {
    const { db } = seeded();

    const copy = await copyView(db, globalAdmin, { viewId: "minePrivate" });

    expect(copy.authorUid).toBe("global");
  });

  it("keeps the copy's name within the length limit", async () => {
    const longName = "x".repeat(500);
    const { db } = fakeFirestore({
      views: { long: { ...storedOf("mineShared"), name: longName } },
    });

    const copy = await copyView(db, owner, { viewId: "long" });

    expect(copy.name).toHaveLength(500);
    expect(copy.name.startsWith("Copy of ")).toBe(true);
  });

  it("throws NOT_FOUND for someone else's private view, copying nothing", async () => {
    const { db, doc } = seeded();

    await expect(
      copyView(db, owner, { viewId: "theirsPrivate" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("views", "theirsPrivate")).toEqual(VIEWS.theirsPrivate);
  });

  it("throws NOT_FOUND for an unknown view", async () => {
    const { db } = seeded();

    await expect(
      copyView(db, owner, { viewId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets a Viewer copy a view they can see, as their own", async () => {
    const { db } = seeded();

    const copy = await copyView(db, viewer, { viewId: "theirsView" });

    expect(copy).toMatchObject({ authorUid: "viewer", shareOption: "PRIVATE" });
  });
});

describe("updateView", () => {
  it.fails("changes the charts and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await updateView(db, owner, {
      viewId: "minePrivate",
      charts: [{ name: "Clicks" }, { name: "Bounces" }],
    });

    const changes = {
      charts: [{ name: "Clicks" }, { name: "Bounces" }],
      updatedAt: NOW,
    };
    expect(updated).toEqual(viewOf("minePrivate", changes));
    expect(doc("views", "minePrivate")).toEqual({
      ...VIEWS.minePrivate,
      ...changes,
    });
  });

  it.fails("changes only the name when only the name is given", async () => {
    freezeTime();
    const { db } = seeded();

    const updated = await updateView(db, owner, {
      viewId: "minePrivate",
      name: "Renamed",
    });

    expect(updated).toEqual(
      viewOf("minePrivate", { name: "Renamed", updatedAt: NOW }),
    );
  });

  it.fails("can empty the chart list", async () => {
    const { db } = seeded();

    const updated = await updateView(db, owner, {
      viewId: "minePrivate",
      charts: [],
    });

    expect(updated.charts).toEqual([]);
  });

  it.fails("lets anyone but a Viewer edit a view shared as ANYONE_EDIT", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await updateView(db, owner, {
      viewId: "theirsEdit",
      charts: [{ name: "Clicks" }],
    });

    // The author and the sharing stay as they were.
    expect(updated).toEqual(
      viewOf("theirsEdit", { charts: [{ name: "Clicks" }], updatedAt: NOW }),
    );
    expect(doc("views", "theirsEdit")).toMatchObject({
      authorUid: "other",
      shareOption: "ANYONE_EDIT",
    });
  });

  it.fails("forbids editing a view that is shared for viewing only", async () => {
    const { db, doc } = seeded();

    await expect(
      updateView(db, owner, { viewId: "theirsView", name: "Mine now" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("views", "theirsView")).toEqual(VIEWS.theirsView);
  });

  it.fails("gives a Global Admin no extra right to edit what they can see", async () => {
    const { db, doc } = seeded();

    // They can see a private view, but cannot edit it.
    await expect(
      updateView(db, globalAdmin, { viewId: "theirsPrivate", name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      updateView(db, globalAdmin, { viewId: "theirsView", name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("views", "theirsPrivate")).toEqual(VIEWS.theirsPrivate);
    expect(doc("views", "theirsView")).toEqual(VIEWS.theirsView);
  });

  it.fails("lets a Global Admin edit a view shared as ANYONE_EDIT", async () => {
    const { db } = seeded();

    const updated = await updateView(db, globalAdmin, {
      viewId: "theirsEdit",
      name: "Renamed",
    });

    expect(updated.name).toBe("Renamed");
  });

  it.fails("lets a Viewer edit a view of their own", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await updateView(db, ownerAsViewer, {
      viewId: "minePrivate",
      name: "Renamed",
      charts: [{ name: "Clicks" }],
    });

    const changes = {
      name: "Renamed",
      charts: [{ name: "Clicks" }],
      updatedAt: NOW,
    };
    expect(updated).toEqual(viewOf("minePrivate", changes));
    expect(doc("views", "minePrivate")).toEqual({
      ...VIEWS.minePrivate,
      ...changes,
    });
  });

  it.fails("forbids a Viewer from editing someone else's view, even one shared as ANYONE_EDIT", async () => {
    const { db, doc } = seeded();

    await expect(
      updateView(db, viewer, { viewId: "theirsEdit", name: "Nope" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("views", "theirsEdit")).toEqual(VIEWS.theirsEdit);
  });

  it.fails("throws NOT_FOUND, not FORBIDDEN, for someone else's private view", async () => {
    const { db, doc } = seeded();

    await expect(
      updateView(db, owner, { viewId: "theirsPrivate", name: "Nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("views", "theirsPrivate")).toEqual(VIEWS.theirsPrivate);
  });

  it.fails("throws NOT_FOUND for an unknown view, creating nothing", async () => {
    const { db, doc } = seeded();

    await expect(
      updateView(db, owner, { viewId: "missing", name: "Nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("views", "missing")).toBeUndefined();
  });

  it.fails("leaves every other view untouched", async () => {
    const { db, doc } = seeded();

    await updateView(db, owner, { viewId: "minePrivate", name: "Renamed" });

    expect(doc("views", "mineShared")).toEqual(VIEWS.mineShared);
    expect(doc("views", "theirsEdit")).toEqual(VIEWS.theirsEdit);
  });
});

describe("setViewShareOption", () => {
  it("changes the share option and stamps the update time", async () => {
    freezeTime();
    const { db, doc } = seeded();

    const updated = await setViewShareOption(db, owner, {
      viewId: "minePrivate",
      shareOption: "ANYONE_EDIT",
    });

    const changes = { shareOption: "ANYONE_EDIT", updatedAt: NOW } as const;
    expect(updated).toEqual(viewOf("minePrivate", changes));
    expect(doc("views", "minePrivate")).toEqual({
      ...VIEWS.minePrivate,
      ...changes,
    });
  });

  it("can make a shared view private again", async () => {
    const { db } = seeded();

    const updated = await setViewShareOption(db, owner, {
      viewId: "mineShared",
      shareOption: "PRIVATE",
    });

    expect(updated.shareOption).toBe("PRIVATE");
  });

  it("forbids anyone but the author, even on a view shared as ANYONE_EDIT", async () => {
    const { db, doc } = seeded();

    await expect(
      setViewShareOption(db, owner, {
        viewId: "theirsEdit",
        shareOption: "PRIVATE",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("views", "theirsEdit")).toEqual(VIEWS.theirsEdit);
  });

  it("lets an author who is a Viewer change it too", async () => {
    const { db } = seeded();

    const updated = await setViewShareOption(db, ownerAsViewer, {
      viewId: "mineShared",
      shareOption: "PRIVATE",
    });

    expect(updated.shareOption).toBe("PRIVATE");
  });

  it("does not let a Global Admin change someone else's sharing", async () => {
    const { db } = seeded();

    await expect(
      setViewShareOption(db, globalAdmin, {
        viewId: "theirsEdit",
        shareOption: "PRIVATE",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND, not FORBIDDEN, for someone else's private view", async () => {
    const { db } = seeded();

    await expect(
      setViewShareOption(db, owner, {
        viewId: "theirsPrivate",
        shareOption: "ANYONE_EDIT",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for an unknown view", async () => {
    const { db } = seeded();

    await expect(
      setViewShareOption(db, owner, {
        viewId: "missing",
        shareOption: "PRIVATE",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
