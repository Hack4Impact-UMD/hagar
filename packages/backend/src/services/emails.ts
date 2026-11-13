import { EmailList, StoredEmailCampaignRecord } from "@repo/common";
import type {
  ActiveUserProfile,
  EmailCampaignSummary,
  EmailListSummary,
  ListEmailCampaignsInput,
} from "@repo/common";
import type { Firestore } from "firebase-admin/firestore";

const CAMPAIGNS_COLLECTION = "email-campaigns";
const LISTS_COLLECTION = "email-lists";

// trimming down to only the summary fields
const parseCampaignSummary = StoredEmailCampaignRecord.pick(
  "name",
  "region",
  "platform",
  "sentAt",
)
  .required()
  .onUndeclaredKey("delete");

const parseListSummary = EmailList.pick("name", "platform").onUndeclaredKey(
  "delete",
);

/**
 * Lists the emails sent within the range, inclusive, newest first. Emails with
 * no `sentAt` are left out.
 */
export async function listEmailCampaigns(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: ListEmailCampaignsInput,
): Promise<EmailCampaignSummary[]> {
  // sentAt strings sort in time order, so a string range works.
  // emails with no sentAt never match a range filter.
  let query = db
    .collection(CAMPAIGNS_COLLECTION)
    .where("sentAt", "<=", input.sentTo);
  if (input.sentFrom !== undefined) {
    query = query.where("sentAt", ">=", input.sentFrom);
  }
  const snapshot = await query.orderBy("sentAt", "desc").get();

  return snapshot.docs.map((doc) => ({
    emailCampaignId: doc.id,
    ...parseCampaignSummary.assert(doc.data()),
  }));
}

/** Lists every email list, sorted by name. */
export async function listEmailLists(
  db: Firestore,
  _actor: ActiveUserProfile,
): Promise<EmailListSummary[]> {
  const snapshot = await db.collection(LISTS_COLLECTION).get();

  // sorted here because firestore's orderBy is case-sensitive
  return snapshot.docs
    .map((doc) => ({
      emailListId: doc.id,
      ...parseListSummary.assert(doc.data()),
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}
