import type { UserRole } from "@repo/common";
import { describe, expect, it } from "vitest";
import {
  describeUserError,
  filterUsers,
  fullName,
  initials,
  paginate,
} from "@common/user-helpers.ts";

function user(
  firstName: string | null,
  lastName: string | null,
  role: UserRole = "Viewer",
) {
  return { firstName, lastName, role };
}

describe("fullName", () => {
  it("joins first and last name", () => {
    expect(fullName(user("Jane", "Doe"))).toBe("Jane Doe");
  });

  it("tolerates missing names", () => {
    expect(fullName(user(null, "Doe"))).toBe("Doe");
    expect(fullName(user(null, null))).toBe("");
  });
});

describe("initials", () => {
  it("takes the first letter of each name", () => {
    expect(initials(user("jane", "Doe"))).toBe("JD");
  });

  it("tolerates missing names", () => {
    expect(initials(user("Jane", null))).toBe("J");
    expect(initials(user(null, null))).toBe("");
  });
});

describe("filterUsers", () => {
  const users = [
    user("Jane", "Doe", "Viewer"),
    user("John", "Smith", "Local Admin"),
    user("Janet", "Ng", "Global Admin"),
  ];

  it("matches names case-insensitively, across first and last name", () => {
    expect(filterUsers(users, { search: "JAN", role: null })).toEqual([
      users[0],
      users[2],
    ]);
    expect(filterUsers(users, { search: "jane doe", role: null })).toEqual([
      users[0],
    ]);
  });

  it("filters by role", () => {
    expect(filterUsers(users, { search: "", role: "Local Admin" })).toEqual([
      users[1],
    ]);
  });

  it("combines search and role", () => {
    expect(filterUsers(users, { search: "jan", role: "Viewer" })).toEqual([
      users[0],
    ]);
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("returns the requested page", () => {
    expect(paginate(items, 1, 2)).toEqual({
      items: [3, 4],
      page: 1,
      pageCount: 3,
    });
  });

  it("clamps a page past the end to the last page", () => {
    expect(paginate(items, 9, 2)).toEqual({
      items: [5],
      page: 2,
      pageCount: 3,
    });
  });

  it("has one empty page when there are no items", () => {
    expect(paginate([], 0, 2)).toEqual({ items: [], page: 0, pageCount: 1 });
  });
});

describe("describeUserError", () => {
  it.each([
    ["FORBIDDEN", "You don't have permission to do that.", false],
    ["NOT_FOUND", expect.stringContaining("deleted"), true],
    ["PRECONDITION_FAILED", expect.stringContaining("changed"), true],
    ["NOT_IMPLEMENTED", "Something went wrong. Please try again.", false],
  ])("handles %s", (code, message, refresh) => {
    expect(describeUserError({ data: { code } })).toEqual({ message, refresh });
  });

  it("falls back to a generic message when there is no code", () => {
    expect(describeUserError({ data: null }).refresh).toBe(false);
    expect(describeUserError({}).message).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
