import {
  copyViewInput,
  createViewInput,
  getViewInput,
  setViewShareOptionInput,
  updateViewInput,
} from "@repo/common";
import { activeProcedure, router } from "@backend/trpc/init.ts";
import {
  copyView,
  createView,
  getView,
  listViews,
  setViewShareOption,
  updateView,
} from "@backend/services/views.ts";

// Every approved user, Viewers included, can make views and manage their own.
// Whether a given view can be seen or edited is decided in the service, from
// the view itself, so a Viewer still can't edit anyone else's.
export const viewsRouter = router({
  list: activeProcedure.query(({ ctx }) => listViews(ctx.db, ctx.profile)),

  get: activeProcedure
    .input(getViewInput)
    .query(({ ctx, input }) => getView(ctx.db, ctx.profile, input)),

  create: activeProcedure
    .input(createViewInput)
    .mutation(({ ctx, input }) => createView(ctx.db, ctx.profile, input)),

  copy: activeProcedure
    .input(copyViewInput)
    .mutation(({ ctx, input }) => copyView(ctx.db, ctx.profile, input)),

  update: activeProcedure
    .input(updateViewInput)
    .mutation(({ ctx, input }) => updateView(ctx.db, ctx.profile, input)),

  setShareOption: activeProcedure
    .input(setViewShareOptionInput)
    .mutation(({ ctx, input }) =>
      setViewShareOption(ctx.db, ctx.profile, input),
    ),
});
