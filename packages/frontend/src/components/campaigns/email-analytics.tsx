import type { EmailCampaignMetric, EmailCampaignSnapshot } from "@repo/common";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { ChartConfig } from "@frontend/components/ui/chart.tsx";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@frontend/components/ui/chart.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { lastDays } from "@frontend/lib/campaignDetails.ts";

/**
 * One day of email engagement. The counts are named after snapshot metrics, so
 * daily totals built from real snapshots can be passed in unchanged.
 */
export type EmailAnalyticsDay = { date: string } & Pick<
  EmailCampaignSnapshot,
  "uniqOpens" | "uniqClicks"
>;

const chartConfig = {
  uniqOpens: { label: "Unique opens", color: "var(--chart-1)" },
  uniqClicks: { label: "Unique clicks", color: "var(--chart-2)" },
} satisfies Partial<Record<EmailCampaignMetric, ChartConfig[string]>>;

const RANGES = {
  "90d": { days: 90, label: "Last 3 months" },
  "30d": { days: 30, label: "Last 30 days" },
  "7d": { days: 7, label: "Last 7 days" },
} as const;
type Range = keyof typeof RANGES;

function isRange(value: string): value is Range {
  return value in RANGES;
}

// Dates are calendar days with no time zone, so they're shown in UTC to keep
// a viewer west of UTC from seeing each one as the day before.
function formatDay(value: unknown): string {
  return new Date(`${String(value)}T00:00:00.000Z`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", timeZone: "UTC" },
  );
}

export function EmailAnalytics({
  data,
}: {
  data: readonly EmailAnalyticsDay[];
}) {
  const [range, setRange] = useState<Range>("90d");
  const visible = lastDays(data, RANGES[range].days);

  return (
    <section
      data-testid="email-analytics"
      className="rounded-[1.25rem] border border-black/20 bg-card"
    >
      <header className="flex flex-wrap items-center gap-2 border-b px-6 py-4">
        <div className="grid flex-1 gap-1">
          <h3 className="text-lg font-bold">Email engagement</h3>
          <p className="text-muted-foreground text-sm">
            Unique opens and clicks per day
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => {
            if (isRange(value)) setRange(value);
          }}
        >
          <SelectTrigger
            className="w-40"
            aria-label="Date range"
            data-testid="email-analytics-range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGES).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>
      <div className="px-2 pt-4 pb-2 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
        >
          <AreaChart data={visible}>
            <defs>
              {(["uniqOpens", "uniqClicks"] as const).map((key) => (
                <linearGradient
                  key={key}
                  id={`fill-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={`var(--color-${key})`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={formatDay}
                  indicator="dot"
                />
              }
            />
            {(["uniqOpens", "uniqClicks"] as const).map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                stackId="a"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
}
