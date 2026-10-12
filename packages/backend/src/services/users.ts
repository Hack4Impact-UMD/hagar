import { storedUserProfile } from "@repo/common";
import type {
  ActiveUserProfile,
  CompleteProfileInput,
  Session,
  StoredUserProfile,
  UpdateProfileInput,
  UserProfile,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

const COLLECTION = "users";

// Drops any stray fields in the document so they never reach the client.
export const parseStored = storedUserProfile.onUndeclaredKey("delete");

/**
 * Parses the caller's own document. Users change their email through Firebase
 * Auth, which never notifies the backend, so the stored copy can be stale or
 * missing and the token's email is used instead.
 */
function parseOwn(data: unknown, session: Session): StoredUserProfile {
  return parseStored.assert({ ...(data as object), email: session.email });
}

/**
 * Returns the caller's profile, creating `users/{uid}` with defaults the first
 * time they are seen, recording a newly verified email, and keeping the stored
 * email in step with the token. The transaction keeps two concurrent calls
 * from both writing.
 */
export async function getOrCreateUserProfile(
  db: Firestore,
  session: Session,
): Promise<UserProfile> {
  const ref = db.collection(COLLECTION).doc(session.uid);

  const stored = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists) {
      const data = snapshot.data();
      const current = parseOwn(data, session);
      const next = advanceIfVerified(current, session);
      if (next !== current || data?.email !== session.email) tx.set(ref, next);
      return next;
    }

    const profile: StoredUserProfile = {
      email: session.email,
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

  return { uid: session.uid, ...stored };
}

/**
 * Returns the caller's profile, or `null` if they have none. Unlike
 * `getOrCreateUserProfile` this never writes, so the procedure middleware can
 * call it on every request.
 */
export async function findUserProfile(
  db: Firestore,
  session: Session,
): Promise<UserProfile | null> {
  const snapshot = await db.collection(COLLECTION).doc(session.uid).get();
  if (!snapshot.exists) return null;
  return { uid: session.uid, ...parseOwn(snapshot.data(), session) };
}

/** Saves edits from the profile page. Returns the updated profile. */
export function updateProfile(
  _db: Firestore,
  _profile: ActiveUserProfile,
  _details: UpdateProfileInput,
): Promise<ActiveUserProfile> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "users.updateProfile is not implemented yet.",
  });
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
    const current = parseOwn(snapshot.data(), session);
    if (current.stage !== "PROFILE SETUP") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Profile setup is not available in the ${current.stage} stage.`,
      });
    }

    const next = advanceIfVerified(
      storedUserProfile.assert({
        email: current.email,
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

  return { uid: session.uid, ...stored };
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
