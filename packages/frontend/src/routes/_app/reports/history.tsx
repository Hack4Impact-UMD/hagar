import { useMemo, useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import type { Report } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { cn } from "cn";
import { Button } from "@frontend/components/ui/button.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { reportPdfUrlOptions } from "@frontend/lib/reportDownloads.ts";
import { filterReports, viewNameFor } from "@frontend/lib/reportSearch.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/**
 * Lists every report the user can see, newest first, with a way to open and
 * download each one. The backend decides which reports the user can see, so
 * the page shows everything it returns.
 */
export const Route = createFileRoute("/_app/reports/history")({
  component: ReportsHistory,
});

// The time tells apart reports of the same view taken on the same day.
const takenAtFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeStyle: "short",
});

type ReportRowData = Pick<Report, "reportId" | "viewId" | "takenAt" | "path">;

function ReportsHistory() {
  const [query, setQuery] = useState("");
  const reports = useQuery(trpc.reports.list.queryOptions());
  const views = useQuery(trpc.views.list.queryOptions());

  const viewNames = useMemo(
    () =>
      new Map<string, string>(
        views.data?.map((view) => [view.viewId, view.name]),
      ),
    [views.data],
  );
  const matches = useMemo(
    () => filterReports(reports.data ?? [], viewNames, query),
    [reports.data, viewNames, query],
  );

  let content: React.ReactNode;
  if (reports.isError || views.isError) {
    content = (
      <Message>
        <p role="alert">Reports could not be loaded.</p>
        <Button
          variant="outline"
          onClick={() => {
            if (reports.isError) void reports.refetch();
            if (views.isError) void views.refetch();
          }}
        >
          Try again
        </Button>
      </Message>
    );
  } else if (reports.isPending || views.isPending) {
    content = (
      <ReportTable busy>
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </ReportTable>
    );
  } else if (reports.data.length === 0) {
    content = (
      <Message>
        <p>No reports yet.</p>
      </Message>
    );
  } else if (matches.length === 0) {
    content = (
      <Message>
        <p>No reports match your search.</p>
      </Message>
    );
  } else {
    content = (
      <ReportTable>
        {matches.map((report) => (
          <ReportRow
            key={report.reportId}
            report={report}
            viewName={viewNameFor(viewNames, report.viewId)}
          />
        ))}
      </ReportTable>
    );
  }

  return (
    // The layout's header is h-12 (3rem). Filling the rest of the screen lets
    // the list scroll inside the card while everything above it stays put.
    <main className="flex h-[calc(100svh-3rem)] flex-col gap-6 px-6 pb-6">
      <PageHeader />
      <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl border bg-card p-6">
        <div className="relative w-63">
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label="Search reports by view name"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-8 pl-8"
          />
        </div>
        {content}
      </section>
    </main>
  );
}

function PageHeader() {
  const router = useRouter();
  // Someone who opened this page directly has nowhere in the app to go back
  // to, and going back would leave the app.
  const canGoBack = useCanGoBack();

  return (
    <div className="flex items-start gap-1">
      {canGoBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={() => router.history.back()}
          className="mt-1.5 text-muted-foreground"
        >
          <CaretLeftIcon className="size-6" />
        </Button>
      )}
      <div className="flex flex-col gap-2.5">
        <h1 data-testid="reports-history" className="text-4xl font-bold">
          Report History
        </h1>
        <p className="text-2xl text-muted-foreground">
          View and download past reports.
        </p>
      </div>
    </div>
  );
}

function ReportTable({
  busy = false,
  children,
}: {
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full table-fixed border-collapse" aria-busy={busy}>
        <thead>
          <tr className="text-left text-base font-bold">
            <th className="sticky top-0 w-2/5 bg-card px-7.5 pb-3">
              View name
            </th>
            <th className="sticky top-0 w-2/5 bg-card px-4 pb-3">Date</th>
            <th className="sticky top-0 bg-card pb-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr aria-hidden className="h-23 border">
      <td className="px-7.5">
        <Skeleton className="h-5 w-40" />
      </td>
      <td className="px-4">
        <Skeleton className="h-5 w-48" />
      </td>
      <td className="px-7.5">
        <Skeleton className="ml-auto h-5 w-24" />
      </td>
    </tr>
  );
}

function ReportRow({
  report,
  viewName,
}: {
  report: ReportRowData;
  viewName: string;
}) {
  return (
    <tr className="h-23 border">
      <td className="px-7.5 text-lg break-words">{viewName}</td>
      <td className="px-4 text-lg text-muted-foreground">
        Created{" "}
        <time dateTime={report.takenAt}>
          {takenAtFormat.format(new Date(report.takenAt))}
        </time>
      </td>
      <td className="px-4">
        <div className="flex items-center justify-end gap-4">
          <ViewLink path={report.path} viewName={viewName} />
        </div>
      </td>
    </tr>
  );
}

/**
 * A real link rather than `window.open` after the URL arrives: browsers block
 * a new tab opened outside the click itself as a popup. So the URL is looked
 * up ahead of time and the link is disabled until it is ready.
 */
function ViewLink({ path, viewName }: { path: string; viewName: string }) {
  const url = useQuery(reportPdfUrlOptions(path));
  const linkStyle =
    "inline-flex items-center gap-1 text-base font-bold text-primary";
  const label = (
    <>
      View <CaretRightIcon aria-hidden className="size-4" />
    </>
  );

  if (url.isError) {
    return (
      <span className="flex items-center gap-1 text-sm text-destructive">
        Could not open
        <Button
          variant="link"
          size="xs"
          aria-label={`Retry opening ${viewName} report`}
          onClick={() => void url.refetch()}
        >
          Retry
        </Button>
      </span>
    );
  }
  if (url.isPending) {
    return (
      <span aria-disabled="true" className={cn(linkStyle, "opacity-50")}>
        {label}
      </span>
    );
  }
  return (
    <a
      href={url.data}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${viewName} report`}
      className={cn(linkStyle, "hover:underline")}
    >
      {label}
    </a>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center text-lg text-muted-foreground">
      {children}
    </div>
  );
}
