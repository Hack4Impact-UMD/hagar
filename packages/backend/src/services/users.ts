import { storedUserProfile } from "@repo/common";
import type {
  CompleteProfileInput,
  Session,
  StoredUserProfile,
  UserProfile,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

const COLLECTION = "users";

// Drops any stray fields in the document so they never reach the client.
const parseStored = storedUserProfile.onUndeclaredKey("delete");

/**
 * Returns the caller's profile, creating `users/{uid}` with defaults the first
 * time they are seen and recording a newly verified email. The transaction
 * keeps two concurrent calls from both writing.
 */
export async function getOrCreateUserProfile(
  db: Firestore,
  session: Session,
): Promise<UserProfile> {
  const ref = db.collection(COLLECTION).doc(session.uid);

  const stored = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists) {
      const current = parseStored.assert(snapshot.data());
      const next = advanceIfVerified(current, session);
      if (next !== current) tx.set(ref, next);
      return next;
    }

    const profile: StoredUserProfile = {
      stage: "PROFILE SETUP",
      photoUrl: null,
      phoneNumber: null,
      firstName: null,
      lastName: null,
      region: null,
      // Least privilege by default. Admins are promoted explicitly.
      role: "Viewer",
      createdAt: Date.now(),
    };
    tx.create(ref, profile);
    return profile;
  });

  return { uid: session.uid, email: session.email, ...stored };
}

/** Saves the setup form and moves the user on to email verification. */
export async function completeProfile(
  db: Firestore,
  session: Session,
  details: CompleteProfileInput,
): Promise<UserProfile> {
  const ref = db.collection(COLLECTION).doc(session.uid);

  const stored = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No profile exists for this user yet.",
      });
    }
    const current = parseStored.assert(snapshot.data());
    if (current.stage !== "PROFILE SETUP") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Profile setup is not available in the ${current.stage} stage.`,
      });
    }

    const next = advanceIfVerified(
      storedUserProfile.assert({
        role: current.role,
        createdAt: current.createdAt,
        ...details,
        stage: "EMAIL VERIFICATION",
      }),
      session,
    );
    tx.set(ref, next);
    return next;
  });

  return { uid: session.uid, email: session.email, ...stored };
}

/**
 * Moves a user past email verification once their token says the email is
 * verified. Firebase Auth owns verification and never notifies the backend,
 * so this runs wherever the profile is read. Returns `profile` itself when
 * nothing changes.
 */
function advanceIfVerified(
  profile: StoredUserProfile,
  session: Session,
): StoredUserProfile {
  if (profile.stage !== "EMAIL VERIFICATION" || !session.emailVerified) {
    return profile;
  }
  return { ...profile, stage: "AWAITING APPROVAL" };
}
