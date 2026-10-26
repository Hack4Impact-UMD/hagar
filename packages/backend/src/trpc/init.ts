import { isActive, isAdminRole } from "@repo/common";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "@backend/trpc/context.ts";
import { findUserProfile } from "@backend/services/users.ts";

const t = initTRPC.context<Context>().create({
  isDev:
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.NODE_ENV !== "production",
});

export const router = t.router;
export const middleware = t.middleware;

/** Calls procedures directly, without HTTP. Used by the unit tests. */
export const createCallerFactory = t.createCallerFactory;

/** Callable by anyone. `ctx.session` may be null. */
export const publicProcedure = t.procedure;

/**
 * Callable only with a valid Firebase ID token. Downstream resolvers see
 * `ctx.session` narrowed to a non-null `Session`.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to call this procedure.",
    });
  }

  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Callable only by an approved user. Downstream resolvers see their profile
 * as `ctx.profile`.
 *
 * The profile is read from Firestore on every call rather than kept in a
 * custom claim, so an approval, demotion, or deletion takes effect on the
 * user's next request instead of when their token next refreshes.
 */
export const activeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await findUserProfile(ctx.db, ctx.session);
  if (!profile || !isActive(profile)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only approved users can call this procedure.",
    });
  }

  return next({ ctx: { ...ctx, profile } });
});

/**
 * Callable by any approved user except a Viewer. Use it for changes to shared
 * data that has no per-user ownership or region to check, such as campaigns.
 */
export const editorProcedure = activeProcedure.use(({ ctx, next }) => {
  if (ctx.profile.role === "Viewer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot make changes.",
    });
  }

  return next();
});

/**
 * Callable only by an approved Global Admin or Local Admin.
 *
 * This only proves the caller is some kind of admin. A Local Admin may act
 * only on users in their own region, and that region comes from the target's
 * document, which the service must read inside the same transaction as its
 * write. So every service behind this procedure must also call
 * `assertCanManage` from `services/permissions.ts` on the target it reads.
 */
export const adminProcedure = activeProcedure.use(({ ctx, next }) => {
  if (!isAdminRole(ctx.profile.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can call this procedure.",
    });
  }

  return next();
});
