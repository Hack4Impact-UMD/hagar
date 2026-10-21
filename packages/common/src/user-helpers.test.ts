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
  email = `${firstName ?? "x"}@example.com`.toLowerCase(),
  phoneNumber: string | null = null,
) {
  return { firstName, lastName, role, email, phoneNumber };
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
    user("Jane", "Doe", "Viewer", "jane.doe@example.com", "(555) 123-4567"),
    user("John", "Smith", "Local Admin", "jsmith@corp.io", "+1 555 987 6543"),
    user("Janet", "Ng", "Global Admin", "janet@example.com", null),
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

  it("ignores spaces in the query and the name", () => {
    expect(filterUsers(users, { search: "janedoe", role: null })).toEqual([
      users[0],
    ]);
    expect(filterUsers(users, { search: "  Jane   Doe ", role: null })).toEqual(
      [users[0]],
    );
  });

  it("matches email case-insensitively", () => {
    expect(filterUsers(users, { search: "JSMITH@", role: null })).toEqual([
      users[1],
    ]);
  });

  it("matches phone numbers regardless of formatting", () => {
    expect(filterUsers(users, { search: "5551234567", role: null })).toEqual([
      users[0],
    ]);
    expect(filterUsers(users, { search: "555-987", role: null })).toEqual([
      users[1],
    ]);
  });

  it("does not match phones for non-numeric queries", () => {
    expect(filterUsers(users, { search: "ng", role: null })).toEqual([
      users[2],
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
