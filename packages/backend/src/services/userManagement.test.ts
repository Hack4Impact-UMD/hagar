import type { ActiveUserProfile, StoredUserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  approveUser,
  deleteUser,
  listUsers,
  setUserRegion,
  setUserRole,
} from "@backend/services/userManagement.ts";

const auth = vi.hoisted(() => ({
  deleteUser: vi.fn<(uid: string) => Promise<void>>(),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => auth }));

beforeEach(() => {
  auth.deleteUser.mockReset();
  auth.deleteUser.mockImplementation(() => Promise.resolve());
});

const details = {
  photoUrl: "https://example.com/me.png",
  phoneNumber: "+15555550100",
  firstName: "Ada",
  lastName: "Lovelace",
};

let nextCreatedAt = 1;
function user(
  uid: string,
  fields: Pick<StoredUserProfile, "role" | "stage"> & {
    region: StoredUserProfile["region"];
  },
): [string, StoredUserProfile] {
  const base = {
    email: `${uid}@example.com`,
    createdAt: nextCreatedAt++,
  };
  if (fields.stage === "PROFILE SETUP") {
    return [
      uid,
      {
        ...base,
        role: fields.role,
        stage: "PROFILE SETUP",
        photoUrl: null,
        phoneNumber: null,
        firstName: null,
        lastName: null,
        region: null,
      },
    ];
  }
  return [uid, { ...base, ...details, ...fields } as StoredUserProfile];
}

// Listed oldest first, so `createdAt` follows this order.
const USERS = Object.fromEntries([
  user("usGlobal", { role: "Global Admin", stage: "ACTIVE", region: "US" }),
  user("caGlobal", { role: "Global Admin", stage: "ACTIVE", region: "Canada" }),
  user("usLocal", { role: "Local Admin", stage: "ACTIVE", region: "US" }),
  user("usLocal2", { role: "Local Admin", stage: "ACTIVE", region: "US" }),
  user("caLocal", { role: "Local Admin", stage: "ACTIVE", region: "Canada" }),
  user("usViewer", { role: "Viewer", stage: "ACTIVE", region: "US" }),
  user("caViewer", { role: "Viewer", stage: "ACTIVE", region: "Canada" }),
  user("usPending", {
    role: "Viewer",
    stage: "AWAITING APPROVAL",
    region: "US",
  }),
  user("caPending", {
    role: "Viewer",
    stage: "AWAITING APPROVAL",
    region: "Canada",
  }),
  user("usVerifying", {
    role: "Viewer",
    stage: "EMAIL VERIFICATION",
    region: "US",
  }),
  user("settingUp", { role: "Viewer", stage: "PROFILE SETUP", region: null }),
]);

function seeded() {
  return fakeFirestore({ users: USERS });
}

/** The profile the middleware would hand the service for `uid`. */
function actor(uid: string): ActiveUserProfile {
  return { uid, ...USERS[uid] } as ActiveUserProfile;
}

/** The profile a procedure should return for `uid` after a change. */
function profileOf(uid: string, changes: Partial<StoredUserProfile> = {}) {
  return { uid, ...USERS[uid], ...changes };
}

describe("listUsers", () => {
  it.fails("lists awaiting users in every region for a Global Admin, oldest first", async () => {
    const { db } = seeded();

    const users = await listUsers(db, actor("usGlobal"), {
      stage: "AWAITING APPROVAL",
    });

    expect(users).toEqual([profileOf("usPending"), profileOf("caPending")]);
  });

  it.fails("narrows a Global Admin's list to one region on request", async () => {
    const { db } = seeded();

    const users = await listUsers(db, actor("usGlobal"), {
      stage: "ACTIVE",
      region: "Canada",
    });

    expect(users.map((u) => u.uid)).toEqual([
      "caGlobal",
      "caLocal",
      "caViewer",
    ]);
  });

  it.fails("lists every active user, including the caller, for a Global Admin", async () => {
    const { db } = seeded();

    const users = await listUsers(db, actor("usGlobal"), { stage: "ACTIVE" });

    expect(users.map((u) => u.uid)).toEqual([
      "usGlobal",
      "caGlobal",
      "usLocal",
      "usLocal2",
      "caLocal",
      "usViewer",
      "caViewer",
    ]);
  });

  it.fails("limits a Local Admin to their own region", async () => {
    const { db } = seeded();

    const pendingUsers = await listUsers(db, actor("usLocal"), {
      stage: "AWAITING APPROVAL",
    });
    const activeUsers = await listUsers(db, actor("usLocal"), {
      stage: "ACTIVE",
    });

    expect(pendingUsers.map((u) => u.uid)).toEqual(["usPending"]);
    // Global Admins in the region are listed even though a Local Admin
    // cannot change them.
    expect(activeUsers.map((u) => u.uid)).toEqual([
      "usGlobal",
      "usLocal",
      "usLocal2",
      "usViewer",
    ]);
  });

  it.fails("accepts a Local Admin's own region as a filter", async () => {
    const { db } = seeded();

    const users = await listUsers(db, actor("usLocal"), {
      stage: "AWAITING APPROVAL",
      region: "US",
    });

    expect(users.map((u) => u.uid)).toEqual(["usPending"]);
  });

  it.fails("forbids a Local Admin from listing another region", async () => {
    const { db } = seeded();

    await expect(
      listUsers(db, actor("usLocal"), {
        stage: "AWAITING APPROVAL",
        region: "Canada",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.fails("returns an empty list when nobody matches", async () => {
    const { db } = seeded();

    await expect(
      listUsers(db, actor("usGlobal"), {
        stage: "AWAITING APPROVAL",
        region: "Australia",
      }),
    ).resolves.toEqual([]);
  });

  it.fails("drops undeclared fields from listed documents", async () => {
    const { db } = fakeFirestore({
      users: { ...USERS, usPending: { ...USERS.usPending, legacy: "stray" } },
    });

    const [listed] = await listUsers(db, actor("usLocal"), {
      stage: "AWAITING APPROVAL",
    });

    expect(listed).toEqual(profileOf("usPending"));
  });
});

describe("approveUser", () => {
  it.fails("activates an awaiting user as a Viewer when no role is given", async () => {
    const { db, doc } = seeded();

    const approved = await approveUser(db, actor("usLocal"), {
      uid: "usPending",
    });

    const expected = { stage: "ACTIVE", role: "Viewer" } as const;
    expect(approved).toEqual(profileOf("usPending", expected));
    expect(doc("users", "usPending")).toEqual({
      ...USERS.usPending,
      ...expected,
    });
  });

  it.fails("lets a Local Admin approve someone as a Local Admin", async () => {
    const { db, doc } = seeded();

    await approveUser(db, actor("usLocal"), {
      uid: "usPending",
      role: "Local Admin",
    });

    expect(doc("users", "usPending")).toMatchObject({
      stage: "ACTIVE",
      role: "Local Admin",
    });
  });

  it.fails("forbids a Local Admin from approving someone as a Global Admin", async () => {
    const { db, doc } = seeded();

    await expect(
      approveUser(db, actor("usLocal"), {
        uid: "usPending",
        role: "Global Admin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usPending")).toEqual(USERS.usPending);
  });

  it.fails("forbids a Local Admin from approving someone in another region", async () => {
    const { db, doc } = seeded();

    await expect(
      approveUser(db, actor("usLocal"), { uid: "caPending" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "caPending")).toEqual(USERS.caPending);
  });

  it.fails("lets a Global Admin approve anyone, with any role, in any region", async () => {
    const { db, doc } = seeded();

    await approveUser(db, actor("usGlobal"), {
      uid: "caPending",
      role: "Global Admin",
    });

    expect(doc("users", "caPending")).toMatchObject({
      stage: "ACTIVE",
      role: "Global Admin",
    });
  });

  it.fails("refuses a user who is not awaiting approval", async () => {
    const { db } = seeded();

    for (const uid of ["usViewer", "usVerifying", "settingUp"]) {
      await expect(
        approveUser(db, actor("usGlobal"), { uid }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
  });

  it.fails("reports a user who does not exist", async () => {
    const { db } = seeded();

    await expect(
      approveUser(db, actor("usGlobal"), { uid: "nobody" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.fails("re-reads the caller, so an admin demoted mid-request is refused", async () => {
    const { db, doc } = fakeFirestore({
      users: { ...USERS, usLocal: { ...USERS.usLocal, role: "Viewer" } },
    });

    // The middleware read the caller before the demotion landed.
    await expect(
      approveUser(db, actor("usLocal"), { uid: "usPending" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usPending")).toEqual(USERS.usPending);
  });
});

describe("setUserRole", () => {
  it.fails("lets a Local Admin promote a Viewer to Local Admin", async () => {
    const { db, doc } = seeded();

    const updated = await setUserRole(db, actor("usLocal"), {
      uid: "usViewer",
      role: "Local Admin",
    });

    expect(updated).toEqual(profileOf("usViewer", { role: "Local Admin" }));
    expect(doc("users", "usViewer")).toEqual({
      ...USERS.usViewer,
      role: "Local Admin",
    });
  });

  it.fails("lets a Local Admin demote another Local Admin", async () => {
    const { db, doc } = seeded();

    await setUserRole(db, actor("usLocal"), {
      uid: "usLocal2",
      role: "Viewer",
    });

    expect(doc("users", "usLocal2")).toMatchObject({ role: "Viewer" });
  });

  it.fails("forbids a Local Admin from granting Global Admin", async () => {
    const { db, doc } = seeded();

    await expect(
      setUserRole(db, actor("usLocal"), {
        uid: "usViewer",
        role: "Global Admin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usViewer")).toEqual(USERS.usViewer);
  });

  it.fails("forbids a Local Admin from changing a Global Admin in their region", async () => {
    const { db, doc } = seeded();

    await expect(
      setUserRole(db, actor("usLocal"), { uid: "usGlobal", role: "Viewer" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usGlobal")).toEqual(USERS.usGlobal);
  });

  it.fails("forbids a Local Admin from changing someone in another region", async () => {
    const { db, doc } = seeded();

    await expect(
      setUserRole(db, actor("usLocal"), {
        uid: "caViewer",
        role: "Local Admin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "caViewer")).toEqual(USERS.caViewer);
  });

  it.fails("lets a Global Admin promote and demote anyone, anywhere", async () => {
    const { db, doc } = seeded();

    await setUserRole(db, actor("usGlobal"), {
      uid: "caViewer",
      role: "Global Admin",
    });
    await setUserRole(db, actor("usGlobal"), {
      uid: "caGlobal",
      role: "Viewer",
    });

    expect(doc("users", "caViewer")).toMatchObject({ role: "Global Admin" });
    expect(doc("users", "caGlobal")).toMatchObject({ role: "Viewer" });
  });

  it.fails("forbids an admin from changing their own role, so a Global Admin always remains", async () => {
    const { db, doc } = seeded();

    for (const uid of ["usGlobal", "usLocal"]) {
      await expect(
        setUserRole(db, actor(uid), { uid, role: "Viewer" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(doc("users", uid)).toEqual(USERS[uid]);
    }
  });

  it.fails("refuses a user who is not active, whose role is set on approval", async () => {
    const { db } = seeded();

    for (const uid of ["usPending", "usVerifying", "settingUp"]) {
      await expect(
        setUserRole(db, actor("usGlobal"), { uid, role: "Local Admin" }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
  });

  it.fails("reports a user who does not exist", async () => {
    const { db } = seeded();

    await expect(
      setUserRole(db, actor("usGlobal"), { uid: "nobody", role: "Viewer" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.fails("re-reads the caller, so an admin demoted mid-request is refused", async () => {
    const { db, doc } = fakeFirestore({
      users: { ...USERS, usLocal: { ...USERS.usLocal, role: "Viewer" } },
    });

    await expect(
      setUserRole(db, actor("usLocal"), {
        uid: "usViewer",
        role: "Local Admin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usViewer")).toEqual(USERS.usViewer);
  });
});

describe("setUserRegion", () => {
  it.fails("lets a Global Admin move an active user, keeping their role and stage", async () => {
    const { db, doc } = seeded();

    const moved = await setUserRegion(db, actor("usGlobal"), {
      uid: "usLocal2",
      region: "Canada",
    });

    expect(moved).toEqual(profileOf("usLocal2", { region: "Canada" }));
    expect(doc("users", "usLocal2")).toEqual({
      ...USERS.usLocal2,
      region: "Canada",
    });
  });

  it.fails("lets a Global Admin move an awaiting user, who keeps waiting", async () => {
    const { db, doc } = seeded();

    await setUserRegion(db, actor("caGlobal"), {
      uid: "usPending",
      region: "Australia",
    });

    expect(doc("users", "usPending")).toEqual({
      ...USERS.usPending,
      region: "Australia",
    });
  });

  it.fails("sends a user a Local Admin moves back to approval as a Viewer", async () => {
    const { db, doc } = seeded();

    const moved = await setUserRegion(db, actor("usLocal"), {
      uid: "usLocal2",
      region: "Canada",
    });

    const expected = {
      region: "Canada",
      role: "Viewer",
      stage: "AWAITING APPROVAL",
    } as const;
    expect(moved).toEqual(profileOf("usLocal2", expected));
    expect(doc("users", "usLocal2")).toEqual({
      ...USERS.usLocal2,
      ...expected,
    });
  });

  it.fails("keeps an awaiting user waiting when a Local Admin moves them", async () => {
    const { db, doc } = seeded();

    await setUserRegion(db, actor("usLocal"), {
      uid: "usPending",
      region: "Canada",
    });

    // They now wait on Canada's admins instead.
    expect(doc("users", "usPending")).toEqual({
      ...USERS.usPending,
      region: "Canada",
    });
  });

  it.fails("changes nothing when the user is already in that region", async () => {
    const { db, doc } = seeded();

    const unchanged = await setUserRegion(db, actor("usLocal"), {
      uid: "usLocal2",
      region: "US",
    });

    // Not a move, so a Local Admin does not send them back to approval.
    expect(unchanged).toEqual(profileOf("usLocal2"));
    expect(doc("users", "usLocal2")).toEqual(USERS.usLocal2);
  });

  it.fails("forbids a Local Admin from moving someone in another region", async () => {
    const { db, doc } = seeded();

    await expect(
      setUserRegion(db, actor("usLocal"), {
        uid: "caViewer",
        region: "US",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "caViewer")).toEqual(USERS.caViewer);
  });

  it.fails("forbids a Local Admin from moving a Global Admin in their region", async () => {
    const { db, doc } = seeded();

    await expect(
      setUserRegion(db, actor("usLocal"), {
        uid: "usGlobal",
        region: "Canada",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usGlobal")).toEqual(USERS.usGlobal);
  });

  it.fails("forbids an admin from moving themselves", async () => {
    const { db, doc } = seeded();

    for (const uid of ["usGlobal", "usLocal"]) {
      await expect(
        setUserRegion(db, actor(uid), { uid, region: "Canada" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(doc("users", uid)).toEqual(USERS[uid]);
    }
  });

  it.fails("refuses a user who has not finished onboarding", async () => {
    const { db } = seeded();

    for (const uid of ["usVerifying", "settingUp"]) {
      await expect(
        setUserRegion(db, actor("usGlobal"), { uid, region: "Canada" }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
  });

  it.fails("reports a user who does not exist", async () => {
    const { db } = seeded();

    await expect(
      setUserRegion(db, actor("usGlobal"), { uid: "nobody", region: "US" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.fails("re-reads the caller, so an admin demoted mid-request is refused", async () => {
    const { db, doc } = fakeFirestore({
      users: { ...USERS, usLocal: { ...USERS.usLocal, role: "Viewer" } },
    });

    await expect(
      setUserRegion(db, actor("usLocal"), {
        uid: "usViewer",
        region: "Canada",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usViewer")).toEqual(USERS.usViewer);
  });
});

describe("deleteUser", () => {
  it.fails("lets a Local Admin reject an awaiting user in their region", async () => {
    const { db, doc } = seeded();

    await deleteUser(db, actor("usLocal"), { uid: "usPending" });

    expect(doc("users", "usPending")).toBeUndefined();
    expect(auth.deleteUser).toHaveBeenCalledWith("usPending");
  });

  it.fails("lets a Local Admin delete an active user in their region", async () => {
    const { db, doc } = seeded();

    await deleteUser(db, actor("usLocal"), { uid: "usLocal2" });

    expect(doc("users", "usLocal2")).toBeUndefined();
    expect(auth.deleteUser).toHaveBeenCalledWith("usLocal2");
  });

  it.fails("lets a Global Admin delete anyone, including another Global Admin and an unfinished signup", async () => {
    const { db, doc } = seeded();

    for (const uid of ["caGlobal", "caPending", "settingUp"]) {
      await deleteUser(db, actor("usGlobal"), { uid });
      expect(doc("users", uid)).toBeUndefined();
      expect(auth.deleteUser).toHaveBeenCalledWith(uid);
    }
  });

  it.fails("forbids a Local Admin from deleting outside their reach", async () => {
    const { db, doc } = seeded();

    // Another region, a Global Admin in their region, and an unfinished
    // signup, which has no region yet.
    for (const uid of ["caPending", "usGlobal", "settingUp"]) {
      await expect(
        deleteUser(db, actor("usLocal"), { uid }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(doc("users", uid)).toEqual(USERS[uid]);
    }
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.fails("forbids an admin from deleting themselves", async () => {
    const { db, doc } = seeded();

    for (const uid of ["usGlobal", "usLocal"]) {
      await expect(deleteUser(db, actor(uid), { uid })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(doc("users", uid)).toEqual(USERS[uid]);
    }
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.fails("reports a user who does not exist", async () => {
    const { db } = seeded();

    await expect(
      deleteUser(db, actor("usGlobal"), { uid: "nobody" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.fails("still deletes the profile when the Auth account is already gone", async () => {
    const { db, doc } = seeded();
    auth.deleteUser.mockRejectedValue(
      Object.assign(new Error("No user record found."), {
        code: "auth/user-not-found",
      }),
    );

    await expect(
      deleteUser(db, actor("usLocal"), { uid: "usPending" }),
    ).resolves.toBeUndefined();
    expect(doc("users", "usPending")).toBeUndefined();
  });

  it.fails("re-reads the caller, so an admin demoted mid-request is refused", async () => {
    const { db, doc } = fakeFirestore({
      users: { ...USERS, usLocal: { ...USERS.usLocal, role: "Viewer" } },
    });

    await expect(
      deleteUser(db, actor("usLocal"), { uid: "usPending" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(doc("users", "usPending")).toEqual(USERS.usPending);
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });
});
