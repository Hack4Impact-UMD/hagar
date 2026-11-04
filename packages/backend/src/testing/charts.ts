import type { ChartDefinition } from "@repo/common";

/** A valid chart, for tests that need one but not its particulars. */
export function chart(name: string): ChartDefinition {
  return {
    name,
    chartId: "EMAIL_LIST_SIZE",
    params: {
      emailListId: "list-1",
      pointInTime: { type: "RELATIVE", anchor: "NOW" },
    },
  };
}
