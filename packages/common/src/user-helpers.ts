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

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function digits(text: string): string {
  return text.replace(/\D/g, "");
}

const phoneLike = /^[\d\s()+.-]+$/;
/* Matches name, email or phone ignoring case and spaces, plus an optional exact role match */
export function filterUsers<
  T extends Named & Pick<UserProfile, "email" | "phoneNumber" | "role">,
>(users: readonly T[], { search, role }: UserFilters): T[] {
  const query = normalize(search);
  // Only digit-compare when the query looks like a phone number. Otherwise a
  // query like "jane" has no digits and would match every phone.
  const phoneQuery = phoneLike.test(search.trim()) ? digits(search) : "";
  return users.filter(
    (user) =>
      (role === null || user.role === role) &&
      (normalize(fullName(user)).includes(query) ||
        normalize(user.email).includes(query) ||
        (phoneQuery !== "" &&
          digits(user.phoneNumber ?? "").includes(phoneQuery))),
  );
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
