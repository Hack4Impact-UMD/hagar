import {
  createReportInput,
  getReportInput,
  listReportsInput,
} from "@repo/common";
import { activeProcedure, router } from "@backend/trpc/init.ts";
import {
  createReport,
  getReport,
  listReports,
} from "@backend/services/reports.ts";

// Every approved user, Viewers included, can take and read reports. What they
// can see is decided in the service, from the report's view.
export const reportsRouter = router({
  list: activeProcedure
    .input(listReportsInput)
    .query(({ ctx, input }) => listReports(ctx.db, ctx.profile, input)),

  get: activeProcedure
    .input(getReportInput)
    .query(({ ctx, input }) => getReport(ctx.db, ctx.profile, input)),

  create: activeProcedure
    .input(createReportInput)
    .mutation(({ ctx, input }) => createReport(ctx.db, ctx.profile, input)),
});
