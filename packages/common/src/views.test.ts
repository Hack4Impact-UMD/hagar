import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  canEditView,
  canSeeView,
  canShareView,
  chartDefinition,
  copyViewInput,
  createViewInput,
  getViewInput,
  setViewShareOptionInput,
  storedView,
  updateViewInput,
  view,
  viewShareOption,
} from "@common/views.ts";

const stored = {
  name: "Q3 overview",
  authorUid: "user-1",
  shareOption: "PRIVATE",
  charts: [{ name: "Open rate" }, { name: "List growth" }],
  updatedAt: "2024-05-01T12:30:00.000Z",
};

describe("viewShareOption", () => {
  it("allows private, view and edit sharing only", () => {
    for (const option of ["PRIVATE", "ANYONE_VIEW", "ANYONE_EDIT"]) {
      expect(viewShareOption(option)).toBe(option);
    }
    for (const option of ["PUBLIC", "private", ""]) {
      expect(viewShareOption(option)).toBeInstanceOf(type.errors);
    }
  });
});

describe("chartDefinition", () => {
  it("needs a non-empty name", () => {
    expect(chartDefinition({ name: "Open rate" })).toEqual({
      name: "Open rate",
    });
    expect(chartDefinition({ name: "" })).toBeInstanceOf(type.errors);
    expect(chartDefinition({})).toBeInstanceOf(type.errors);
  });
});

describe("storedView", () => {
  it("accepts a view, including one with no charts yet", () => {
    expect(storedView(stored)).toEqual(stored);
    expect(storedView({ ...stored, charts: [] })).toEqual({
      ...stored,
      charts: [],
    });
  });

  it("requires a UTC date string for the update time", () => {
    for (const updatedAt of [1714566600000, "2024-05-01", "yesterday"]) {
      expect(storedView({ ...stored, updatedAt })).toBeInstanceOf(type.errors);
    }
  });

  it("rejects an unknown share option, a missing author, or a bad chart", () => {
    expect(storedView({ ...stored, shareOption: "PUBLIC" })).toBeInstanceOf(
      type.errors,
    );
    expect(storedView({ ...stored, authorUid: "" })).toBeInstanceOf(
      type.errors,
    );
    expect(storedView({ ...stored, charts: [{ name: "" }] })).toBeInstanceOf(
      type.errors,
    );
  });
});

const author = { uid: "user-1", role: "Local Admin" } as const;
const someone = { uid: "user-2", role: "Local Admin" } as const;
const aViewer = { uid: "user-3", role: "Viewer" } as const;
const authorAsViewer = { uid: "user-1", role: "Viewer" } as const;
const shared = (shareOption: "PRIVATE" | "ANYONE_VIEW" | "ANYONE_EDIT") => ({
  authorUid: "user-1",
  shareOption,
});

const globalAdmin = { uid: "user-4", role: "Global Admin" } as const;

describe("canSeeView", () => {
  it("shows a private view only to its author and Global Admins", () => {
    expect(canSeeView(author, shared("PRIVATE"))).toBe(true);
    expect(canSeeView(globalAdmin, shared("PRIVATE"))).toBe(true);
    expect(canSeeView(someone, shared("PRIVATE"))).toBe(false);
    expect(canSeeView(aViewer, shared("PRIVATE"))).toBe(false);
  });

  it("shows a shared view to everyone", () => {
    for (const option of ["ANYONE_VIEW", "ANYONE_EDIT"] as const) {
      for (const user of [author, someone, aViewer]) {
        expect(canSeeView(user, shared(option))).toBe(true);
      }
    }
  });
});

describe("canEditView", () => {
  it("lets the author edit whatever the share option", () => {
    for (const option of ["PRIVATE", "ANYONE_VIEW", "ANYONE_EDIT"] as const) {
      expect(canEditView(author, shared(option))).toBe(true);
    }
  });

  it("lets others edit only when the view is shared as ANYONE_EDIT", () => {
    expect(canEditView(someone, shared("ANYONE_EDIT"))).toBe(true);
    expect(canEditView(someone, shared("ANYONE_VIEW"))).toBe(false);
    expect(canEditView(someone, shared("PRIVATE"))).toBe(false);
  });

  it("gives a Global Admin no extra right to edit what they can see", () => {
    expect(canEditView(globalAdmin, shared("PRIVATE"))).toBe(false);
    expect(canEditView(globalAdmin, shared("ANYONE_VIEW"))).toBe(false);
    expect(canEditView(globalAdmin, shared("ANYONE_EDIT"))).toBe(true);
  });

  it("lets a Viewer edit their own view, whatever the share option", () => {
    for (const option of ["PRIVATE", "ANYONE_VIEW", "ANYONE_EDIT"] as const) {
      expect(canEditView(authorAsViewer, shared(option))).toBe(true);
    }
  });

  it("never lets a Viewer edit someone else's view, even ANYONE_EDIT", () => {
    for (const option of ["PRIVATE", "ANYONE_VIEW", "ANYONE_EDIT"] as const) {
      expect(canEditView(aViewer, shared(option))).toBe(false);
    }
  });
});

describe("canShareView", () => {
  it("lets only the author change the share option", () => {
    expect(canShareView(author, shared("PRIVATE"))).toBe(true);
    expect(canShareView(someone, shared("ANYONE_EDIT"))).toBe(false);
    expect(canShareView(globalAdmin, shared("ANYONE_EDIT"))).toBe(false);
  });

  it("lets an author who is a Viewer change it too", () => {
    expect(canShareView(authorAsViewer, shared("PRIVATE"))).toBe(true);
    expect(canShareView(aViewer, shared("ANYONE_EDIT"))).toBe(false);
  });
});

describe("view procedure inputs", () => {
  it("accept a minimal create and fill in nothing themselves", () => {
    expect(createViewInput({ name: "Q3 overview" })).toEqual({
      name: "Q3 overview",
    });
    const full = {
      name: "Q3 overview",
      charts: [{ name: "Open rate" }],
      shareOption: "ANYONE_VIEW",
    };
    expect(createViewInput(full)).toEqual(full);
  });

  it("accept an update of the name, the charts, or both", () => {
    for (const change of [
      { name: "New" },
      { charts: [] },
      { name: "New", charts: [{ name: "Open rate" }] },
    ]) {
      expect(updateViewInput({ viewId: "v-1", ...change })).toEqual({
        viewId: "v-1",
        ...change,
      });
    }
  });

  it("reject an update that changes nothing", () => {
    expect(updateViewInput({ viewId: "v-1" })).toBeInstanceOf(type.errors);
  });

  it("reject undeclared keys, including inside a chart", () => {
    for (const result of [
      getViewInput({ viewId: "v-1", extra: 1 }),
      copyViewInput({ viewId: "v-1", authorUid: "u" }),
      createViewInput({ name: "x", authorUid: "someone-else" }),
      createViewInput({ name: "x", updatedAt: "2024-05-01T12:30:00.000Z" }),
      createViewInput({ name: "x", charts: [{ name: "a", extra: 1 }] }),
      updateViewInput({ viewId: "v-1", name: "x", authorUid: "u" }),
      updateViewInput({ viewId: "v-1", charts: [{ name: "a", extra: 1 }] }),
      setViewShareOptionInput({
        viewId: "v-1",
        shareOption: "PRIVATE",
        authorUid: "u",
      }),
    ]) {
      expect(result).toBeInstanceOf(type.errors);
    }
  });

  it("reject an empty id, an empty name, and an unknown share option", () => {
    expect(getViewInput({ viewId: "" })).toBeInstanceOf(type.errors);
    expect(copyViewInput({ viewId: "" })).toBeInstanceOf(type.errors);
    expect(createViewInput({ name: "" })).toBeInstanceOf(type.errors);
    expect(updateViewInput({ viewId: "v-1", name: "" })).toBeInstanceOf(
      type.errors,
    );
    expect(
      setViewShareOptionInput({ viewId: "v-1", shareOption: "PUBLIC" }),
    ).toBeInstanceOf(type.errors);
  });
});

describe("view", () => {
  it("adds the document id to the stored shape", () => {
    expect(view({ viewId: "view-1", ...stored })).toEqual({
      viewId: "view-1",
      ...stored,
    });
    expect(view(stored)).toBeInstanceOf(type.errors);
    expect(view({ viewId: "", ...stored })).toBeInstanceOf(type.errors);
  });
});
