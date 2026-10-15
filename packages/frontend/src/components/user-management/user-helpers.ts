import type { UserProfile, UserRole } from "@repo/common";

export const userRoles: readonly UserRole[] = [
  "Viewer",
  "Local Admin",
  "Global Admin",
];

type Named = Pick<UserProfile, "firstName" | "lastName">;

export function fullName(user: Named): string {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
}

export function initials(user: Named): string {
  return [user.firstName, user.lastName]
    .map((part) => part?.trim().charAt(0).toUpperCase() ?? "")
    .join("");
}

interface UserFilters {
  search: string;
  role: UserRole | null;
}

/* Case-insensitive name match, plus an optional exact role match */
export function filterUsers<T extends Named & Pick<UserProfile, "role">>(
  users: readonly T[],
  { search, role }: UserFilters,
): T[] {
  const query = search.trim().toLowerCase();
  return users.filter(
    (user) =>
      (role === null || user.role === role) &&
      fullName(user).toLowerCase().includes(query),
  );
}

/* Returns one page of items, page is clamped */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; pageCount: number } {
  const count = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 0), count - 1);
  const start = current * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageCount: count,
  };
}

interface ErrorWithCode {
  data?: { code?: string } | null;
}

/* What to tell the admin when a user management call fails */
export function describeUserError(error: ErrorWithCode): {
  message: string;
  refresh: boolean;
} {
  switch (error.data?.code) {
    case "FORBIDDEN":
      return {
        message: "You don't have permission to do that.",
        refresh: false,
      };
    case "NOT_FOUND":
      return {
        message:
          "Another admin already deleted this person. The list has been refreshed.",
        refresh: true,
      };
    case "PRECONDITION_FAILED":
      return {
        message:
          "Another admin already changed this person. The list has been refreshed.",
        refresh: true,
      };
    default:
      return {
        message: "Something went wrong. Please try again.",
        refresh: false,
      };
  }
}
