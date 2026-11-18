import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  canEditView,
  canSeeView,
  canShareView,
  copyViewInput,
  createViewInput,
  getViewInput,
  setViewShareOptionInput,
  updateViewInput,
} from "@common/views.ts";

const chart = {
  name: "Open rate",
  chartId: "EMAIL_LIST_SIZE",
  params: {
    emailListId: "list-1",
    pointInTime: { type: "RELATIVE", anchor: "NOW" },
  },
};

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
  it("reject an update that changes nothing", () => {
    expect(updateViewInput({ viewId: "v-1" })).toBeInstanceOf(type.errors);
  });

  it("reject undeclared keys, including inside a chart", () => {
    for (const result of [
      getViewInput({ viewId: "v-1", extra: 1 }),
      copyViewInput({ viewId: "v-1", authorUid: "u" }),
      createViewInput({ name: "x", authorUid: "someone-else" }),
      createViewInput({ name: "x", updatedAt: "2024-05-01T12:30:00.000Z" }),
      createViewInput({ name: "x", charts: [{ ...chart, extra: 1 }] }),
      updateViewInput({ viewId: "v-1", name: "x", authorUid: "u" }),
      updateViewInput({ viewId: "v-1", charts: [{ ...chart, extra: 1 }] }),
      setViewShareOptionInput({
        viewId: "v-1",
        shareOption: "PRIVATE",
        authorUid: "u",
      }),
    ]) {
      expect(result).toBeInstanceOf(type.errors);
    }
  });
});
