import { describe, expect, it } from "vitest";
import { filterViewsByName } from "@frontend/lib/viewSearch.ts";

const views = [
  { viewId: "1", name: "Executive Overview" },
  { viewId: "2", name: "Staff Overview" },
  { viewId: "3", name: "Regional Summary" },
  { viewId: "4", name: "Quarterly Review" },
  { viewId: "5", name: "Donor Overview" },
  { viewId: "6", name: "Campaign Results" },
  { viewId: "7", name: "Volunteer Hours" },
  { viewId: "8", name: "Site Visits" },
  { viewId: "9", name: "Budget Overview" },
];

describe("filterViewsByName", () => {
  it("matches anywhere in the name, ignoring case and surrounding spaces", () => {
    expect(
      filterViewsByName(views, "  overview ").map((view) => view.viewId),
    ).toEqual(["1", "2", "5", "9"]);
  });

  it("keeps the original order", () => {
    expect(
      filterViewsByName(views, "overview").map((view) => view.name),
    ).toEqual([
      "Executive Overview",
      "Staff Overview",
      "Donor Overview",
      "Budget Overview",
    ]);
  });

  it("shows only the first handful when the query is empty", () => {
    expect(filterViewsByName(views, "   ")).toEqual(views.slice(0, 8));
  });

  it("caps a matching query at eight results", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      name: `Chart ${index}`,
    }));
    expect(filterViewsByName(many, "chart")).toHaveLength(8);
  });

  it("returns nothing when the name does not match", () => {
    expect(filterViewsByName(views, "missing")).toEqual([]);
  });
});
