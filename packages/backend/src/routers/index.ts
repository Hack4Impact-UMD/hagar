import {
  createCallerFactory,
  protectedProcedure,
  router,
} from "@backend/trpc/init.ts";
import { campaignsRouter } from "@backend/routers/campaigns.ts";
import { reportsRouter } from "@backend/routers/reports.ts";
import { usersRouter } from "@backend/routers/users.ts";
import { viewsRouter } from "@backend/routers/views.ts";
import { getOrCreateUserProfile } from "@backend/services/users.ts";

export const appRouter = router({
  /** Needs a valid token. Returns the caller's profile, creating it on first call. */
  me: protectedProcedure.query(({ ctx }) =>
    getOrCreateUserProfile(ctx.db, ctx.session),
  ),

  users: usersRouter,
  campaigns: campaignsRouter,
  views: viewsRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
