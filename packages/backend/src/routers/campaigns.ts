import {
  getCampaignInput,
  linkedItemInput,
  setCampaignNotesInput,
  utmCodeInput,
} from "@repo/common";
import {
  activeProcedure,
  editorProcedure,
  router,
} from "@backend/trpc/init.ts";
import {
  addLinkedItem,
  addUtmCode,
  getCampaign,
  listCampaigns,
  removeLinkedItem,
  removeUtmCode,
  setCampaignNotes,
} from "@backend/services/campaigns.ts";

// Viewers can read campaigns but not change them.
export const campaignsRouter = router({
  list: activeProcedure.query(({ ctx }) => listCampaigns(ctx.db, ctx.profile)),

  get: activeProcedure
    .input(getCampaignInput)
    .query(({ ctx, input }) => getCampaign(ctx.db, ctx.profile, input)),

  setNotes: editorProcedure
    .input(setCampaignNotesInput)
    .mutation(({ ctx, input }) => setCampaignNotes(ctx.db, ctx.profile, input)),

  addLinkedItem: editorProcedure
    .input(linkedItemInput)
    .mutation(({ ctx, input }) => addLinkedItem(ctx.db, ctx.profile, input)),

  removeLinkedItem: editorProcedure
    .input(linkedItemInput)
    .mutation(({ ctx, input }) => removeLinkedItem(ctx.db, ctx.profile, input)),

  addUtmCode: editorProcedure
    .input(utmCodeInput)
    .mutation(({ ctx, input }) => addUtmCode(ctx.db, ctx.profile, input)),

  removeUtmCode: editorProcedure
    .input(utmCodeInput)
    .mutation(({ ctx, input }) => removeUtmCode(ctx.db, ctx.profile, input)),
});
