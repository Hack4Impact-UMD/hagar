import {
  chartDefinition,
  emailCampaignMetricChart,
  emailCampaignMetricOverTimeChart,
  emailListSizeChart,
  emailListSizeOverTimeChart,
  pointInTime,
  resolvePointInTime,
} from "@repo/common";
import type {
  ChartDefinition,
  ChartId,
  PointInTime,
  UtcDateString,
} from "@repo/common";

export type Ago = NonNullable<
  Extract<PointInTime, { type: "RELATIVE" }>["ago"]
>;

/* One date control in the editor. A relative one with no `ago` is "Now". */
export type DateControl =
  | { mode: "FIXED"; date: Date | undefined }
  | { mode: "RELATIVE"; ago: Ago | undefined };

type ChartParams = ChartDefinition["params"];
type KeysOf<T> = T extends unknown ? keyof T : never;
// every param any chart type takes, like metric or start
export type ParamKey = KeysOf<ChartParams>;
type ParamValue<K extends ParamKey> = Extract<
  ChartParams,
  Record<K, unknown>
>[K];

// what the form holds for each param. dates are controls until saved
export type FieldValues = {
  [K in ParamKey]?: ParamValue<K> extends PointInTime
    ? DateControl
    : ParamValue<K>;
};

/* Everything the chart editor holds while the user fills it in. */
export type ChartForm = {
  title: string;
  chartId: ChartId;
  values: FieldValues;
};

export type Field =
  | { kind: "LIST" | "EMAIL" | "METRIC" }
  | {
      kind: "DATE";
      label: string;
      edge: "START" | "END";
      initial: DateControl;
    };

const NOW: DateControl = { mode: "RELATIVE", ago: undefined };

// the input for each param. a Record so a new param fails to compile until it
// gets an input here
export const FIELDS: Record<ParamKey, Field> = {
  emailListId: { kind: "LIST" },
  emailCampaignId: { kind: "EMAIL" },
  metric: { kind: "METRIC" },
  pointInTime: { kind: "DATE", label: "As of", edge: "END", initial: NOW },
  start: {
    kind: "DATE",
    label: "Start",
    edge: "START",
    initial: { mode: "RELATIVE", ago: { amount: 1, unit: "MONTH" } },
  },
  end: { kind: "DATE", label: "End", edge: "END", initial: NOW },
};

export type Channel = "INSTAGRAM" | "WEBSITE" | "EMAIL" | "LINKEDIN";

// the params come from each chart's schema, so only the label and channel are
// written by hand
export const CHART_TYPES: Record<
  ChartId,
  { label: string; channel: Channel; params: readonly ParamKey[] }
> = {
  EMAIL_LIST_SIZE: {
    label: "Email list size",
    channel: "EMAIL",
    params: emailListSizeChart.definition.get("params").props.map((p) => p.key),
  },
  EMAIL_LIST_SIZE_OVER_TIME: {
    label: "Email list size over time",
    channel: "EMAIL",
    params: emailListSizeOverTimeChart.definition
      .get("params")
      .props.map((p) => p.key),
  },
  EMAIL_CAMPAIGN_METRIC: {
    label: "Email metric",
    channel: "EMAIL",
    params: emailCampaignMetricChart.definition
      .get("params")
      .props.map((p) => p.key),
  },
  EMAIL_CAMPAIGN_METRIC_OVER_TIME: {
    label: "Email metric over time",
    channel: "EMAIL",
    params: emailCampaignMetricOverTimeChart.definition
      .get("params")
      .props.map((p) => p.key),
  },
};

// in FIELDS order, so inputs always render in the same order
export function paramsOf(chartId: ChartId): ParamKey[] {
  const params = CHART_TYPES[chartId].params;
  return (Object.keys(FIELDS) as ParamKey[]).filter((key) =>
    params.includes(key),
  );
}

// keeps only the values the type takes, filling in starting dates
function valuesFor(chartId: ChartId, current: FieldValues): FieldValues {
  const values: Record<string, unknown> = {};
  for (const key of paramsOf(chartId)) {
    const field = FIELDS[key];
    values[key] =
      current[key] ?? (field.kind === "DATE" ? field.initial : undefined);
  }
  return values as FieldValues;
}

export function newChartForm(chartId: ChartId = "EMAIL_LIST_SIZE"): ChartForm {
  return { title: "", chartId, values: valuesFor(chartId, {}) };
}

// keeps the title and any value the new type also takes, so dates carry over
// and a pick of the other kind is dropped
export function changeChartType(form: ChartForm, chartId: ChartId): ChartForm {
  return { ...form, chartId, values: valuesFor(chartId, form.values) };
}

// fixed start saves the start of the day and fixed end saves the end of the
// day, so the picked day is included. undefined if no day is picked yet
function controlToPoint(
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
  const params: Record<string, unknown> = {};
  for (const key of paramsOf(form.chartId)) {
    const field = FIELDS[key];
    const value = form.values[key];
    params[key] =
      field.kind === "DATE" && value
        ? controlToPoint(value as DateControl, field.edge)
        : value;
  }
  const candidate = { name: form.title.trim(), chartId: form.chartId, params };
  // Unfinished fields are `undefined` which `chartDefinition` then rejects.
  return chartDefinition.allows(candidate) ? candidate : undefined;
}

export function chartToForm(chart: ChartDefinition): ChartForm {
  const params: Partial<Record<ParamKey, unknown>> = chart.params;
  const values: Record<string, unknown> = {};
  for (const key of paramsOf(chart.chartId)) {
    values[key] =
      FIELDS[key].kind === "DATE"
        ? pointToControl(params[key] as PointInTime)
        : params[key];
  }
  return { title: chart.name, chartId: chart.chartId, values };
}

// the amount box can be empty or out of range while typing, and resolving that
// would throw, so it gives undefined instead
function resolveControl(
  control: DateControl | undefined,
  edge: "START" | "END",
  now: Date,
): UtcDateString | undefined {
  const point = control && controlToPoint(control, edge);
  return point && pointInTime.allows(point)
    ? resolvePointInTime(point, now)
    : undefined;
}

// from is only set for types with a start date. an unfinished date makes
// complete false but still counts as in order
export function resolveDates(form: ChartForm, now: Date) {
  let from: UtcDateString | undefined;
  let to: UtcDateString | undefined;
  let complete = true;
  for (const key of paramsOf(form.chartId)) {
    const field = FIELDS[key];
    if (field.kind !== "DATE") continue;
    const resolved = resolveControl(
      form.values[key] as DateControl | undefined,
      field.edge,
      now,
    );
    if (!resolved) complete = false;
    if (field.edge === "START") from = resolved;
    else to = resolved;
  }
  return { from, to, complete, inOrder: !from || !to || from < to };
}
