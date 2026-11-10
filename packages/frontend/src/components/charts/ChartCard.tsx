import type { ChartData, ChartDefinition } from "@repo/common";
import { chartWidth, resolvePointInTime } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import type { ChartConfig } from "@frontend/components/ui/chart.tsx";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui/card.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@frontend/components/ui/chart.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { EMAIL_CAMPAIGN_METRIC_LABELS } from "@frontend/lib/emailMetrics.ts";
import { formatChartDate, formatCount } from "@frontend/lib/chartFormat.ts";
import { trpc } from "@frontend/lib/trpc.ts";

// Written out in full because Tailwind only generates classes it can find in
// the source, and cannot see ones built from strings.
const COLUMN_SPAN = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
} as const;

const SERIES_CONFIG = {
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

function subtitle(chart: ChartDefinition): string | null {
  switch (chart.chartId) {
    case "EMAIL_CAMPAIGN_METRIC":
    case "EMAIL_CAMPAIGN_METRIC_OVER_TIME":
      return EMAIL_CAMPAIGN_METRIC_LABELS[chart.params.metric];
    default:
      return null;
  }
}

function asOf(chart: ChartDefinition): string | null {
  switch (chart.chartId) {
    case "EMAIL_LIST_SIZE":
    case "EMAIL_CAMPAIGN_METRIC":
      return formatChartDate(
        resolvePointInTime(chart.params.pointInTime, new Date()),
      );
    default:
      return null;
  }
}

function NoData() {
  return (
    <p className="py-8 text-center text-muted-foreground">
      No data for this date
    </p>
  );
}

function SeriesChart({
  points,
}: {
  points: Extract<ChartData, { type: "SERIES" }>["points"];
}) {
  // Plotted on a time axis, not by index, so the width of each step matches
  // how long that value actually held.
  const data = points.map((p) => ({ at: Date.parse(p.at), value: p.value }));
  return (
    <ChartContainer config={SERIES_CONFIG} className="h-48 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatChartDate}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCount}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                typeof payload[0]?.payload?.at === "number"
                  ? formatChartDate(payload[0].payload.at)
                  : ""
              }
            />
          }
        />
        {/* A value holds until the next snapshot, so a smooth curve would
            show changes that never happened. */}
        <Area
          dataKey="value"
          type="stepAfter"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function Body({ chart, data }: { chart: ChartDefinition; data: ChartData }) {
  if (data.type === "VALUE") {
    if (data.value === null) return <NoData />;
    const date = asOf(chart);
    return (
      <div>
        <p className="text-4xl font-semibold tabular-nums">
          {formatCount(data.value)}
        </p>
        {date && <p className="text-sm text-muted-foreground">As of {date}</p>}
      </div>
    );
  }
  if (data.points.length === 0) return <NoData />;
  return <SeriesChart points={data.points} />;
}

/** One chart from a view. It loads its own numbers. */
export function ChartCard({ chart }: { chart: ChartDefinition }) {
  const query = useQuery(trpc.charts.data.queryOptions({ chart }));
  const sub = subtitle(chart);

  return (
    <Card data-testid="chart-card" className={COLUMN_SPAN[chartWidth(chart)]}>
      <CardHeader>
        <CardTitle>{chart.name}</CardTitle>
        {sub && <CardDescription>{sub}</CardDescription>}
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton data-testid="chart-loading" className="h-24 w-full" />
        ) : query.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 text-destructive"
          >
            <p>Could not load this chart.</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <Body chart={chart} data={query.data} />
        )}
      </CardContent>
    </Card>
  );
}
