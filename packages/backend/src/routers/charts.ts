import { chartDataInput } from "@repo/common";
import { activeProcedure, router } from "@backend/trpc/init.ts";
import { getChartData } from "@backend/services/charts.ts";

// Viewers see every region's data and build their own views.
export const chartsRouter = router({
  data: activeProcedure
    .input(chartDataInput)
    .query(({ ctx, input }) =>
      getChartData(ctx.db, ctx.profile, input, new Date()),
    ),
});
