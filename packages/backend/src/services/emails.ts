import type {
  ActiveUserProfile,
  EmailCampaignSummary,
  EmailListSummary,
  ListEmailCampaignsInput,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Lists the emails sent within the range, inclusive, newest first. Emails with
 * no `sentAt` are left out.
 */
export function listEmailCampaigns(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: ListEmailCampaignsInput,
): Promise<EmailCampaignSummary[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "emails.campaigns is not implemented yet.",
  });
}

/** Lists every email list, sorted by name. */
export function listEmailLists(
  _db: Firestore,
  _actor: ActiveUserProfile,
): Promise<EmailListSummary[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "emails.lists is not implemented yet.",
  });
}
