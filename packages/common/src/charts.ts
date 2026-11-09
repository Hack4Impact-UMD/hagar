import { type } from "arktype";
import { pointInTime } from "@common/dates.ts";
import { EmailCampaignMetric } from "@common/emails.ts";

// Length caps exist only to bound abuse. They sit far above any real value.
const name = type("1 <= string <= 500");

/** Charts sit on a 3-column grid, so a width is the number of columns it spans. */
export type ChartWidth = 1 | 2 | 3;

/**
 * Every chart has a `name`. `chartId` says which kind of chart it is, and so
 * which `params` it takes and how wide it is. Each chart kind is declared once
 * with `defineChart`, which pins `chartId` to a literal so the kinds form a
 * union discriminated on it. The width belongs to the kind, not to a chart, so
 * it is not stored; look it up with `chartWidth`.
 */
function defineChart<const Id extends string, const Params extends object>(
  chartId: Id,
  width: ChartWidth,
  params: type.Any<Params>,
) {
  return {
    chartId,
    width,
    definition: type({ name, chartId: type.unit(chartId), params }),
  };
}

const emailListId = type("string >= 1");

/** How many subscribers an email list had at a point in time. */
export const emailListSizeChart = defineChart(
  "EMAIL_LIST_SIZE",
  1,
  type({ emailListId, pointInTime }),
);

/** How an email list's size changed between two points in time. */
export const emailListSizeOverTimeChart = defineChart(
  "EMAIL_LIST_SIZE_OVER_TIME",
  1,
  type({ emailListId, start: pointInTime, end: pointInTime }),
);

const emailCampaignId = type("string >= 1");

/** One of a campaign's counts, such as its bounces or unique opens, at a point in time. */
export const emailCampaignMetricChart = defineChart(
  "EMAIL_CAMPAIGN_METRIC",
  1,
  type({ emailCampaignId, metric: EmailCampaignMetric, pointInTime }),
);

/** How one of a campaign's counts changed between two points in time. */
export const emailCampaignMetricOverTimeChart = defineChart(
  "EMAIL_CAMPAIGN_METRIC_OVER_TIME",
  1,
  type({
    emailCampaignId,
    metric: EmailCampaignMetric,
    start: pointInTime,
    end: pointInTime,
  }),
);

/**
 * A single chart or metric on a view. To add a chart kind, declare it with
 * `defineChart`, then join its `definition` here with `.or(...)` and list the
 * kind in `chartKinds`. Reports copy these as they stand, so a report keeps
 * what the view showed.
 */
export const chartDefinition = emailListSizeChart.definition
  .or(emailListSizeOverTimeChart.definition)
  .or(emailCampaignMetricChart.definition)
  .or(emailCampaignMetricOverTimeChart.definition);
export type ChartDefinition = typeof chartDefinition.infer;

export type ChartId = ChartDefinition["chartId"];

const chartKinds: readonly { chartId: ChartId; width: ChartWidth }[] = [
  emailListSizeChart,
  emailListSizeOverTimeChart,
  emailCampaignMetricChart,
  emailCampaignMetricOverTimeChart,
];

/** The number of grid columns a chart of this kind spans. */
export function chartWidth(
  chart: Pick<ChartDefinition, "chartId">,
): ChartWidth {
  const kind = chartKinds.find((k) => k.chartId === chart.chartId);
  if (!kind) throw new Error(`Unknown chart kind ${chart.chartId}`);
  return kind.width;
}
