import { completeProfileInput } from "@repo/common";
import { protectedProcedure, router } from "@backend/trpc/init.ts";
import { completeProfile } from "@backend/services/users.ts";

export const usersRouter = router({
  completeProfile: protectedProcedure
    .input(completeProfileInput)
    .mutation(({ ctx, input }) => completeProfile(ctx.db, ctx.session, input)),
});
