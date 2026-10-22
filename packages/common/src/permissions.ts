import type {
  ActiveUserProfile,
  StoredUserProfile,
  UserRole,
} from "@common/user.ts";

/** The admin making a change. */
export type Actor = Pick<ActiveUserProfile, "uid" | "role" | "region">;

/** The user being changed. */
export type Target = Pick<StoredUserProfile, "role" | "region"> & {
  uid: string;
};

/**
 * Whether `actor` may change `target` at all. A Global Admin may change
 * anyone. A Local Admin may change anyone in their own region except a Global
 * Admin, and a user still in profile setup has no region, so only a Global
 * Admin can reach them.
 *
 * Nobody may change themselves through user management. That rule also keeps
 * at least one Global Admin in place: only a Global Admin can demote or delete
 * another, so removing the last one would mean acting on themselves.
 *
 * The backend enforces this; the frontend uses it only to hide controls the
 * backend would refuse.
 */
export function canManage(actor: Actor, target: Target): boolean {
  if (actor.uid === target.uid) return false;
  switch (actor.role) {
    case "Global Admin":
      return true;
    case "Local Admin":
      return target.region === actor.region && target.role !== "Global Admin";
    case "Viewer":
      return false;
  }
}

/** Local Admins may promote people to their own level but not above it. */
export function canAssignRole(actor: Actor, role: UserRole): boolean {
  switch (actor.role) {
    case "Global Admin":
      return true;
    case "Local Admin":
      return role !== "Global Admin";
    case "Viewer":
      return false;
  }
}
