import {
  approveUserInput,
  completeProfileInput,
  deleteUserInput,
  listUsersInput,
  setUserRegionInput,
  setUserRoleInput,
  updateProfileInput,
  userInfoInput,
} from "@repo/common";
import {
  activeProcedure,
  adminProcedure,
  protectedProcedure,
  router,
} from "@backend/trpc/init.ts";
import {
  completeProfile,
  getUserInfo,
  updateProfile,
} from "@backend/services/users.ts";
import {
  approveUser,
  deleteUser,
  listUsers,
  setUserRegion,
  setUserRole,
} from "@backend/services/userManagement.ts";

export const usersRouter = router({
  completeProfile: protectedProcedure
    .input(completeProfileInput)
    .mutation(({ ctx, input }) => completeProfile(ctx.db, ctx.session, input)),

  updateProfile: activeProcedure
    .input(updateProfileInput)
    .mutation(({ ctx, input }) => updateProfile(ctx.db, ctx.profile, input)),

  // Open to every approved user, unlike the user management procedures below:
  // it only returns names and photos, to show who made something.
  info: activeProcedure
    .input(userInfoInput)
    .query(({ ctx, input }) => getUserInfo(ctx.db, ctx.profile, input)),

  list: adminProcedure
    .input(listUsersInput)
    .query(({ ctx, input }) => listUsers(ctx.db, ctx.profile, input)),

  approve: adminProcedure
    .input(approveUserInput)
    .mutation(({ ctx, input }) => approveUser(ctx.db, ctx.profile, input)),

  setRole: adminProcedure
    .input(setUserRoleInput)
    .mutation(({ ctx, input }) => setUserRole(ctx.db, ctx.profile, input)),

  setRegion: adminProcedure
    .input(setUserRegionInput)
    .mutation(({ ctx, input }) => setUserRegion(ctx.db, ctx.profile, input)),

  // Rejecting an applicant deletes their account, so there is no separate
  // reject procedure.
  delete: adminProcedure
    .input(deleteUserInput)
    .mutation(({ ctx, input }) => deleteUser(ctx.db, ctx.profile, input)),
});
