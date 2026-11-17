import { describe, expect, it } from "vitest";
import {
  CUSTOM,
  NOW,
  PRESETS,
  chartToForm,
  formToChart,
  presetOf,
  resolveDates,
} from "@frontend/lib/chartForm.ts";
import type { ChartForm, DateControl } from "@frontend/lib/chartForm.ts";

const now = new Date(2026, 10, 17, 12);

function rangeForm(start: DateControl, end: DateControl): ChartForm {
  return {
    title: "Donors",
    chartId: "EMAIL_LIST_SIZE_OVER_TIME",
    values: { emailListId: "donors", start, end },
  };
}

const fixed = (day: number): DateControl => ({
  mode: "FIXED",
  date: new Date(2026, 9, day, 15),
});

// saves the form, reopens it and saves again
function reopen(form: ChartForm) {
  const chart = formToChart(form);
  const reopened = chart && chartToForm(chart);
  return { chart, reopened, again: reopened && formToChart(reopened) };
}

describe("saving and reopening a chart", () => {
  type Case = [string, DateControl, DateControl, string];
  const cases: Case[] = [
    ...PRESETS.map(({ label, ago }): Case => [
      label,
      { mode: "RELATIVE", ago },
      NOW,
      label,
    ]),
    ["Custom", fixed(1), fixed(20), CUSTOM],
    ["Custom ending now", fixed(1), NOW, CUSTOM],
  ];

  it.each(cases)("gives back the same chart for %s", (_, start, end, range) => {
    const { chart, reopened, again } = reopen(rangeForm(start, end));
    expect(chart).toBeDefined();
    expect(again).toEqual(chart);
    const values = reopened?.values;
    expect(
      values?.start && values.end && presetOf(values.start, values.end),
    ).toBe(range);
  });
});

describe("custom dates", () => {
  it("rejects a start after the end", () => {
    expect(resolveDates(rangeForm(fixed(20), fixed(1)), now).inOrder).toBe(
      false,
    );
  });

  it("allows the same day for both as a one-day range", () => {
    const form = rangeForm(fixed(5), fixed(5));
    expect(formToChart(form)).toBeDefined();
    expect(resolveDates(form, now)).toMatchObject({
      complete: true,
      inOrder: true,
    });
  });
});
