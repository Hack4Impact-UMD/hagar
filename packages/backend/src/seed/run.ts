import { createInterface } from "node:readline/promises";
import { inspect, parseArgs } from "node:util";
import { profilePhotoFolder } from "@repo/common";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import type { Credential } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { placeholderPdf, solidPng } from "@backend/seed/assets.ts";
import {
  EMAIL_CONTENT_FOLDER,
  EMAIL_LISTS_COLLECTION,
  SEED_PASSWORD,
  SEED_PREFIX,
  buildSeedData,
} from "@backend/seed/data.ts";
import {
  COLLECTION as CAMPAIGNS,
  LINKED_ITEM_COLLECTIONS,
} from "@backend/services/campaigns.ts";
import { COLLECTION as REPORTS } from "@backend/services/reports.ts";
import { COLLECTION as USERS } from "@backend/services/users.ts";
import { COLLECTION as VIEWS } from "@backend/services/views.ts";

// Matches the project the frontend and `.firebaserc` default to, and the ports
// in `firebase.json`.
const EMULATOR_PROJECT_ID = "hagar-intl";
const EMULATOR_HOSTS = {
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
};

/**
 * Collections that `--clean` empties completely, seeded or not. Users are not
 * here: only seeded users are removed.
 */
const WIPED_COLLECTIONS = [
  VIEWS,
  REPORTS,
  CAMPAIGNS,
  LINKED_ITEM_COLLECTIONS.EMAIL,
  EMAIL_LISTS_COLLECTION,
];

/** Storage folders that belong to the collections above. */
const WIPED_STORAGE_PREFIXES = ["reports/", EMAIL_CONTENT_FOLDER];

const USAGE = `Usage: pnpm seed [--clean] [--project <id> [--bucket <name>] [--yes]]

  (no flags)       Seed the local emulators.
  --clean          Remove seeded users, and delete every view, report, campaign,
                   email campaign and email list. Real users are kept.
  --project <id>   Run against that live Firebase project instead of the
                   emulators. Uses Application Default Credentials.
  --bucket <name>  Storage bucket for a live project. Defaults to
                   <id>.firebasestorage.app.
  --yes            Skip the confirmation prompt for a live project.`;

const { values: args } = parseArgs({
  options: {
    clean: { type: "boolean", default: false },
    project: { type: "string" },
    bucket: { type: "string" },
    yes: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const live = args.project !== undefined;
const projectId = args.project ?? EMULATOR_PROJECT_ID;
const bucketName = args.bucket ?? `${projectId}.firebasestorage.app`;

let credential: Credential | undefined;
if (live) {
  // A shell that still exports these would send the run to the emulators while
  // the prompt below claims it is touching the live project.
  for (const name of Object.keys(EMULATOR_HOSTS)) delete process.env[name];
  credential = await requireCredentials();
} else {
  Object.assign(process.env, EMULATOR_HOSTS);
}

initializeApp({
  credential,
  projectId,
  storageBucket: bucketName,
});
if (live) {
  await requireAuthAccess();
  await confirmLiveRun();
}
const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

const target = live ? `LIVE project ${projectId}` : "the emulators";
console.log(`${args.clean ? "Cleaning" : "Seeding"} ${target}`);
await (args.clean ? clean() : seed());

/**
 * Fails before the confirmation prompt, so nobody confirms a run that can't
 * start. The Admin SDK would otherwise fail on its first request with an error
 * that doesn't say how to fix it.
 */
async function requireCredentials(): Promise<Credential> {
  try {
    const found = applicationDefault();
    await found.getAccessToken();
    return found;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      `Could not get Google credentials for "${projectId}": ${reason}\n` +
        "Run `gcloud auth application-default login`, or set " +
        "GOOGLE_APPLICATION_CREDENTIALS to a service account key file.",
    );
    process.exit(1);
  }
}

/**
 * Reads one user before anything is changed. User credentials with no quota
 * project work for Firestore and Storage but are rejected by the Auth API, and
 * `--clean` would already have emptied Firestore by the time it got there.
 */
async function requireAuthAccess() {
  try {
    await getAuth().listUsers(1);
  } catch (error) {
    const missingQuotaProject = inspect(error, { depth: 8 }).includes(
      "requires a quota project",
    );
    const reason = error instanceof Error ? error.message : String(error);
    console.error(
      missingQuotaProject
        ? "Google rejected your credentials because they have no quota project.\n" +
            `Run \`gcloud auth application-default set-quota-project ${projectId}\` and try again.`
        : `Could not read Firebase Auth for "${projectId}": ${reason}\n` +
            "Check that the signed-in account has access to the project.",
    );
    process.exit(1);
  }
}

async function confirmLiveRun() {
  const action = args.clean
    ? "DELETE every view, report, campaign, email campaign and email list, and the seeded users, in"
    : "write seeded users and data to";
  console.log(`This will ${action} the live project "${projectId}".`);
  if (args.yes) return;

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await prompt.question(`Type "${projectId}" to continue: `);
  prompt.close();
  if (answer.trim() !== projectId) {
    console.log("Cancelled.");
    process.exit(1);
  }
}

async function seed() {
  const data = buildSeedData(new Date());

  for (const user of data.users) {
    const properties = {
      email: user.email,
      password: SEED_PASSWORD,
      emailVerified: user.emailVerified,
      ...(user.displayName ? { displayName: user.displayName } : {}),
    };
    const existing = await auth.getUser(user.uid).catch(() => null);
    await (existing
      ? auth.updateUser(user.uid, properties)
      : auth.createUser({ uid: user.uid, ...properties }));

    if (user.avatar && user.profile.photoPath) {
      await bucket.file(user.profile.photoPath).save(solidPng(user.avatar), {
        contentType: "image/png",
      });
    }
  }

  for (const email of data.emailCampaigns) {
    await bucket.file(email.record.contentPath).save(email.html, {
      contentType: "text/html; charset=utf-8",
    });
  }
  for (const report of data.reports) {
    await bucket
      .file(report.record.path)
      .save(placeholderPdf(report.pdfTitle), {
        contentType: "application/pdf",
      });
  }

  const writer = db.bulkWriter();
  for (const user of data.users) {
    void writer.set(db.collection(USERS).doc(user.uid), user.profile);
  }
  for (const list of data.emailLists) {
    void writer.set(
      db.collection(EMAIL_LISTS_COLLECTION).doc(list.id),
      list.record,
    );
  }
  for (const email of data.emailCampaigns) {
    void writer.set(
      db.collection(LINKED_ITEM_COLLECTIONS.EMAIL).doc(email.id),
      email.record,
    );
  }
  for (const campaign of data.campaigns) {
    void writer.set(db.collection(CAMPAIGNS).doc(campaign.id), campaign.record);
  }
  for (const view of data.views) {
    void writer.set(db.collection(VIEWS).doc(view.id), view.record);
  }
  for (const report of data.reports) {
    void writer.set(db.collection(REPORTS).doc(report.id), report.record);
  }
  await writer.close();

  console.log(
    `Seeded ${data.users.length} users (password "${SEED_PASSWORD}"), ` +
      `${data.emailLists.length} email lists, ${data.emailCampaigns.length} email campaigns, ` +
      `${data.campaigns.length} campaigns, ${data.views.length} views, ` +
      `${data.reports.length} reports.`,
  );
}

async function clean() {
  for (const collection of WIPED_COLLECTIONS) {
    await db.recursiveDelete(db.collection(collection));
    console.log(`Emptied ${collection}`);
  }
  for (const prefix of WIPED_STORAGE_PREFIXES) {
    await bucket.deleteFiles({ prefix });
    console.log(`Emptied ${prefix}`);
  }

  const seededUids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.uid.startsWith(SEED_PREFIX)) seededUids.add(user.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  // A profile can outlive its Auth account, so find those by id as well.
  const orphans = await db
    .collection(USERS)
    .where(FieldPath.documentId(), ">=", SEED_PREFIX)
    .where(FieldPath.documentId(), "<", `${SEED_PREFIX}`)
    .select()
    .get();
  for (const doc of orphans.docs) seededUids.add(doc.id);

  const uids = [...seededUids];
  for (let start = 0; start < uids.length; start += 1000) {
    await auth.deleteUsers(uids.slice(start, start + 1000));
  }
  for (const uid of uids) {
    await db.collection(USERS).doc(uid).delete();
    await bucket.deleteFiles({ prefix: profilePhotoFolder(uid) });
  }
  console.log(`Removed ${uids.length} seeded users`);
}
