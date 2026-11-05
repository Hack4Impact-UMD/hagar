import type { View } from "@repo/common";
import { DownloadSimpleIcon, FileTextIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { ViewPicker } from "@frontend/components/reports/ViewPicker.tsx";
import type { ViewListStatus } from "@frontend/components/reports/ViewPicker.tsx";

export type ReportPreviewStatus =
  | "loading"
  | "empty"
  | "not-found"
  | "error"
  | "ready";

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
    <main
      data-testid="report-preview"
      className="flex flex-col px-9 py-6 md:h-[calc(100svh-3rem)] md:min-h-0"
    >
      <div className="mb-9 shrink-0">
        <p className="text-[35px] font-bold">Report Preview</p>
        <p className="text-2xl text-muted-foreground">
          Create, customize, and export reports.
        </p>
      </div>

      <div className="mb-7 shrink-0">
        <ViewPicker
          views={views}
          currentViewId={currentViewId}
          listStatus={listStatus}
          onSelect={onSelectView}
          disabled={status === "loading"}
        />
        {listError ? (
          <p role="alert" className="mt-3 flex items-center gap-3 text-sm">
            {listError}
            <Button type="button" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </p>
        ) : null}
      </div>

      <section className="min-h-0 overflow-y-auto rounded-lg border px-[34px] pt-[34px] pb-6">
        {(status === "loading" || status === "empty") && (
          <ReportPreviewSkeleton />
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
          <div className="flex w-full flex-col gap-6">
            <h1 className="text-2xl font-bold">{view.name}</h1>
            {view.charts.length === 0 ? (
              <p>This view has no charts yet.</p>
            ) : (
              <div className={previewGridClass}>
                {view.charts.map((chart, index) => (
                  <div
                    key={index} // oxlint-disable-line react/no-array-index-key -- names can repeat; order is the identity
                    className="flex aspect-square items-center justify-center rounded-lg border p-4 shadow-md"
                  >
                    {chart.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="mt-6 flex shrink-0 flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-5">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[6px]"
              disabled
            >
              Edit
            </Button>
          )}
          <Button size="sm" className="rounded-[6px]" asChild>
            <Link to="/reports/history">
              <FileTextIcon />
              View Past Reports
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-[6px]"
            disabled={exportDisabled}
            onClick={onExport}
          >
            <DownloadSimpleIcon />
            {generatePending ? "Exporting…" : "Export as PDF"}
          </Button>
          {downloadUrl && (
            <Button size="sm" className="rounded-[6px]" asChild>
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </Button>
          )}
        </div>
        {generateError && (
          <p role="alert" className="text-destructive">
            {generateError}
          </p>
        )}
      </footer>
    </main>
  );
}

// Wide enough to fill the card, short enough that the buttons stay on screen.
const previewGridClass =
  "grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3";

function ReportPreviewSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-bold">Report Title</h1>
      <div className={previewGridClass}>
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
      </div>
    </div>
  );
}
