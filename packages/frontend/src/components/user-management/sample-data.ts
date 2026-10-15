import type { UserProfile, UserRegion, UserRole } from "@repo/common";

function sampleUser(
  uid: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  region: UserRegion,
  stage: "AWAITING APPROVAL" | "ACTIVE",
): UserProfile {
  return {
    uid,
    email: `${firstName.toLowerCase()}@gmail.com`,
    firstName,
    lastName,
    phoneNumber: "555-0100",
    photoPath: null,
    region,
    role,
    stage,
    createdAt: Date.now(),
  } as unknown as UserProfile;
}

const pending = Array.from({ length: 10 }, (_, i) =>
  sampleUser(
    `p${i}`,
    "Jane",
    "Doe",
    "Viewer",
    "New Zealand",
    "AWAITING APPROVAL",
  ),
);

const active = [
  sampleUser("a1", "Full", "Name", "Local Admin", "US", "ACTIVE"),
  sampleUser("a2", "Sam", "Lee", "Local Admin", "Canada", "ACTIVE"),
  sampleUser("a3", "Priya", "Shah", "Viewer", "Canada", "ACTIVE"),
  sampleUser("a4", "Tom", "Ng", "Viewer", "Australia", "ACTIVE"),
  sampleUser("a5", "Maria", "Lopez", "Local Admin", "New Zealand", "ACTIVE"),
  sampleUser("a6", "Chris", "Park", "Viewer", "US", "ACTIVE"),
  sampleUser("a7", "Dana", "Wu", "Viewer", "New Zealand", "ACTIVE"),
  sampleUser("a8", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
  sampleUser("a9", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
  sampleUser("a10", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
  sampleUser("a11", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
  sampleUser("a12", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
  sampleUser("a13", "Lee", "Brown", "Global Admin", "Australia", "ACTIVE"),
];

export const sampleUsers: UserProfile[] = [...pending, ...active];
