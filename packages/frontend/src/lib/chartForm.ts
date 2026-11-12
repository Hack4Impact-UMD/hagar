import { chartDefinition, resolvePointInTime } from "@repo/common";
import type {
  ChartDefinition,
  ChartId,
  EmailCampaignMetric,
  PointInTime,
} from "@repo/common";

type Ago = NonNullable<Extract<PointInTime, { type: "RELATIVE" }>["ago"]>;

/* One date control in the editor. A relative one with no `ago` is "Now". */
export type DateControl =
  | { mode: "FIXED"; date: Date | undefined }
  | { mode: "RELATIVE"; ago: Ago | undefined };

/* Everything the chart editor holds while the user fills it in. */
export type ChartForm = {
  title: string;
  chartId: ChartId;
  // Only email charts use it, but it is kept across type changes.
  metric: EmailCampaignMetric | undefined;
  asOf: DateControl;
  start: DateControl;
  end: DateControl;
  // An email or a list, depending on `chartId`.
  selectedId: string | undefined;
};

export const CHART_TYPES: Record<
  ChartId,
  { label: string; dates: "AS_OF" | "RANGE"; picks: "EMAIL" | "LIST" }
> = {
  EMAIL_LIST_SIZE: { label: "Email list size", dates: "AS_OF", picks: "LIST" },
  EMAIL_LIST_SIZE_OVER_TIME: {
    label: "Email list size over time",
    dates: "RANGE",
    picks: "LIST",
  },
  EMAIL_CAMPAIGN_METRIC: {
    label: "Email metric",
    dates: "AS_OF",
    picks: "EMAIL",
  },
  EMAIL_CAMPAIGN_METRIC_OVER_TIME: {
    label: "Email metric over time",
    dates: "RANGE",
    picks: "EMAIL",
  },
};

const NOW: DateControl = { mode: "RELATIVE", ago: undefined };

export function newChartForm(): ChartForm {
  return {
    title: "",
    chartId: "EMAIL_LIST_SIZE",
    metric: undefined,
    asOf: NOW,
    start: { mode: "RELATIVE", ago: { amount: 1, unit: "MONTH" } },
    end: NOW,
    selectedId: undefined,
  };
}

// keeps the title and dates, and drops a pick of the wrong kind
export function changeChartType(form: ChartForm, chartId: ChartId): ChartForm {
  const samePick =
    CHART_TYPES[form.chartId].picks === CHART_TYPES[chartId].picks;
  return {
    ...form,
    chartId,
    selectedId: samePick ? form.selectedId : undefined,
  };
}

/**
 * The point in time a control saves, or `undefined` if no day is picked yet.
 * A fixed date means a whole day to the user, so a start takes the day's first
 * moment and an end its last, which keeps the picked day in the range.
 */
export function controlToPoint(
  control: DateControl,
  edge: "START" | "END",
): PointInTime | undefined {
  if (control.mode === "RELATIVE") {
    return control.ago
      ? { type: "RELATIVE", anchor: "NOW", ago: control.ago }
      : { type: "RELATIVE", anchor: "NOW" };
  }
  if (!control.date) return undefined;
  const date = new Date(control.date);
  if (edge === "START") date.setHours(0, 0, 0, 0);
  else date.setHours(23, 59, 59, 999);
  return { type: "STATIC", date: date.toISOString() };
}

function pointToControl(point: PointInTime): DateControl {
  if (point.type === "STATIC")
    return { mode: "FIXED", date: new Date(point.date) };
  // form only offers "Now", so a saved TODAY anchor shows as "Now"
  return { mode: "RELATIVE", ago: point.ago };
}

/* The chart the form describes, or `undefined` until the form is complete. */
export function formToChart(form: ChartForm): ChartDefinition | undefined {
  const candidate = candidateFor(form);
  return chartDefinition.allows(candidate) ? candidate : undefined;
}

// Unfinished fields are `undefined` which `chartDefinition` then rejects.
function candidateFor(form: ChartForm): unknown {
  const name = form.title.trim();
  const { chartId, selectedId, metric } = form;
  switch (chartId) {
    case "EMAIL_LIST_SIZE":
      return {
        name,
        chartId,
        params: {
          emailListId: selectedId,
          pointInTime: controlToPoint(form.asOf, "END"),
        },
      };
    case "EMAIL_LIST_SIZE_OVER_TIME":
      return {
        name,
        chartId,
        params: {
          emailListId: selectedId,
          start: controlToPoint(form.start, "START"),
          end: controlToPoint(form.end, "END"),
        },
      };
    case "EMAIL_CAMPAIGN_METRIC":
      return {
        name,
        chartId,
        params: {
          emailCampaignId: selectedId,
          metric,
          pointInTime: controlToPoint(form.asOf, "END"),
        },
      };
    case "EMAIL_CAMPAIGN_METRIC_OVER_TIME":
      return {
        name,
        chartId,
        params: {
          emailCampaignId: selectedId,
          metric,
          start: controlToPoint(form.start, "START"),
          end: controlToPoint(form.end, "END"),
        },
      };
  }
}

export function chartToForm(chart: ChartDefinition): ChartForm {
  const form = { ...newChartForm(), title: chart.name, chartId: chart.chartId };
  switch (chart.chartId) {
    case "EMAIL_LIST_SIZE":
      return {
        ...form,
        selectedId: chart.params.emailListId,
        asOf: pointToControl(chart.params.pointInTime),
      };
    case "EMAIL_LIST_SIZE_OVER_TIME":
      return {
        ...form,
        selectedId: chart.params.emailListId,
        start: pointToControl(chart.params.start),
        end: pointToControl(chart.params.end),
      };
    case "EMAIL_CAMPAIGN_METRIC":
      return {
        ...form,
        selectedId: chart.params.emailCampaignId,
        metric: chart.params.metric,
        asOf: pointToControl(chart.params.pointInTime),
      };
    case "EMAIL_CAMPAIGN_METRIC_OVER_TIME":
      return {
        ...form,
        selectedId: chart.params.emailCampaignId,
        metric: chart.params.metric,
        start: pointToControl(chart.params.start),
        end: pointToControl(chart.params.end),
      };
  }
}

export function startIsBeforeEnd(form: ChartForm, now: Date): boolean {
  if (CHART_TYPES[form.chartId].dates !== "RANGE") return true;
  const start = controlToPoint(form.start, "START");
  const end = controlToPoint(form.end, "END");
  if (!start || !end) return true;
  return resolvePointInTime(start, now) < resolvePointInTime(end, now);
}
