import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  chartDefinition,
  storedView,
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
