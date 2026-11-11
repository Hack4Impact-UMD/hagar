import type {
  ActiveUserProfile,
  ChartData,
  ChartDataInput,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Reads a chart's numbers from the snapshots of its email or list. Relative
 * dates resolve from `now`, which is passed in so tests can fix it.
 */
export function getChartData(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: ChartDataInput,
  _now: Date,
): Promise<ChartData> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "charts.data is not implemented yet.",
  });
}
