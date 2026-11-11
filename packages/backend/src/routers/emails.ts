import { listEmailCampaignsInput } from "@repo/common";
import { activeProcedure, router } from "@backend/trpc/init.ts";
import {
  listEmailCampaigns,
  listEmailLists,
} from "@backend/services/emails.ts";

// Viewers build their own views too, so any approved user can list emails.
export const emailsRouter = router({
  campaigns: activeProcedure
    .input(listEmailCampaignsInput)
    .query(({ ctx, input }) => listEmailCampaigns(ctx.db, ctx.profile, input)),

  lists: activeProcedure.query(({ ctx }) =>
    listEmailLists(ctx.db, ctx.profile),
  ),
});
