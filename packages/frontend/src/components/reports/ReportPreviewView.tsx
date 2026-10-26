import type { View } from "@repo/common";
import { DownloadSimpleIcon, FileTextIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { ViewPicker } from "@frontend/components/reports/ViewPicker.tsx";
import type { ViewListStatus } from "@frontend/components/reports/ViewPicker.tsx";

export type ReportPreviewStatus = "loading" | "not-found" | "error" | "ready";

export type ReportPreviewViewProps = {
  views: View[];
  currentViewId: string;
  listStatus: ViewListStatus;
  view: View | null;
  status: ReportPreviewStatus;
  errorMessage: string | null;
  listError: string | null;
  canEdit: boolean;
  generatePending: boolean;
  generateError: string | null;
  downloadUrl: string | null;
  onSelectView: (viewId: string) => void;
  onRetry: () => void;
  onExport: () => void;
};

export function ReportPreviewView({
  views,
  currentViewId,
  listStatus,
  view,
  status,
  errorMessage,
  listError,
  canEdit,
  generatePending,
  generateError,
  downloadUrl,
  onSelectView,
  onRetry,
  onExport,
}: ReportPreviewViewProps) {
  const exportDisabled =
    generatePending || status !== "ready" || !view || view.charts.length === 0;

  return (
    <main data-testid="report-preview" className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-2xl font-bold">Report Preview</p>
        <p className="text-muted-foreground">
          Create, customize, and export reports.
        </p>
      </div>

      <ViewPicker
        views={views}
        currentViewId={currentViewId}
        listStatus={listStatus}
        onSelect={onSelectView}
        disabled={status === "loading"}
      />
      {listError ? (
        <p role="alert" className="flex items-center gap-3 text-sm">
          {listError}
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </p>
      ) : null}

      <section className="rounded-lg border p-6">
        {status === "loading" && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="aspect-square w-full" />
            </div>
          </div>
        )}

        {status === "not-found" && <p>That view does not exist.</p>}

        {status === "error" && (
          <div className="flex flex-col gap-3">
            <p>{errorMessage ?? "Something went wrong."}</p>
            <Button type="button" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && view && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">{view.name}</h1>
            {view.charts.length === 0 ? (
              <p>This view has no charts yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {view.charts.map((chart, index) => (
                  <div
                    key={index} // oxlint-disable-line react/no-array-index-key -- names can repeat; order is the identity
                    className="flex aspect-square items-center justify-center rounded-lg border p-4"
                  >
                    {chart.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEdit && (
            <Button type="button" variant="outline" disabled>
              Edit
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/reports/history">
              <FileTextIcon />
              View Past Reports
            </Link>
          </Button>
          <Button type="button" disabled={exportDisabled} onClick={onExport}>
            <DownloadSimpleIcon />
            {generatePending ? "Exporting…" : "Export as PDF"}
          </Button>
        </div>
        {generateError && (
          <p role="alert" className="text-destructive">
            {generateError}
          </p>
        )}
        {downloadUrl && (
          <p>
            Report generated.{" "}
            <a href={downloadUrl} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          </p>
        )}
      </footer>
    </main>
  );
}
