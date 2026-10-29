import { canEditView } from "@repo/common";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { ReportPreviewView } from "@frontend/components/reports/ReportPreviewView.tsx";
import type { ReportPreviewStatus } from "@frontend/components/reports/ReportPreviewView.tsx";
import type { ViewListStatus } from "@frontend/components/reports/ViewPicker.tsx";
import {
  buildReportPdf,
  reportDownloadUrl,
  uploadReportPdf,
} from "@frontend/lib/reports.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

const DOWNLOAD_LINK_FAILED =
  "The report was saved, but the download link could not be created.";

/**
 * Previews what a report of one view will look like, and generates it. The view
 * comes from the URL, so a preview can be linked to and reloaded.
 */
export const Route = createFileRoute("/_app/reports/preview/$viewId")({
  component: ReportPreview,
});

function ReportPreview() {
  const { viewId } = Route.useParams();
  const navigate = useNavigate();
  const viewQuery = useQuery(trpc.views.get.queryOptions({ viewId }));
  const listQuery = useQuery(trpc.views.list.queryOptions());
  const meQuery = useQuery(trpc.me.queryOptions());
  const createReport = useMutation(trpc.reports.create.mutationOptions());
  // The button disables on the next render, which is too late for a double click.
  const exportInFlight = useRef(false);
  // Bumped when the view changes so a finished export cannot paint the previous view's link.
  const exportGeneration = useRef(0);
  const seenViewId = useRef(viewId);
  // Set only after reports.create returns. A later link failure retries this path.
  const savedPath = useRef<string | null>(null);
  // Which view the in-flight or finished export belongs to.
  const [exportViewId, setExportViewId] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: async () => {
      const view = await queryClient.fetchQuery({
        ...trpc.views.get.queryOptions({ viewId }),
        staleTime: 0,
      });
      if (view.charts.length === 0) {
        throw new Error("This view has no charts yet.");
      }
      const reportId = crypto.randomUUID();
      const pdf = await buildReportPdf(view);
      try {
        await uploadReportPdf(view.viewId, reportId, pdf);
      } catch {
        throw new Error(
          "The report could not be uploaded. Try again in a moment.",
        );
      }
      // The backend rejects charts, the path, and the time. It records those itself.
      const report = await createReport.mutateAsync({
        viewId: view.viewId,
        reportId,
      });
      return report.path;
    },
  });

  const link = useMutation({
    mutationFn: (path: string) => reportDownloadUrl(path),
  });

  const { reset: resetGenerate } = generate;
  const { reset: resetLink } = link;
  useEffect(() => {
    if (seenViewId.current === viewId) return;
    seenViewId.current = viewId;
    exportGeneration.current += 1;
    exportInFlight.current = false;
    savedPath.current = null;
    setExportViewId(null);
    resetGenerate();
    resetLink();
  }, [viewId, resetGenerate, resetLink]);

  const status = previewStatus(viewQuery.isPending, viewQuery.error);
  const view = viewQuery.data ?? null;
  const profile = meQuery.data;
  const exportForThisView = exportViewId === viewId;

  const openDownload = (path: string, generation: number) => {
    link.mutate(path, {
      onSettled: () => {
        if (exportGeneration.current === generation) {
          exportInFlight.current = false;
        }
      },
    });
  };

  const exportReport = () => {
    if (exportInFlight.current) return;
    const generation = exportGeneration.current;
    const path = savedPath.current;
    exportInFlight.current = true;
    setExportViewId(viewId);
    if (path) {
      openDownload(path, generation);
      return;
    }
    generate.mutate(undefined, {
      onSuccess: (nextPath) => {
        if (exportGeneration.current !== generation) return;
        savedPath.current = nextPath;
        openDownload(nextPath, generation);
      },
      onError: () => {
        if (exportGeneration.current === generation) {
          exportInFlight.current = false;
        }
      },
    });
  };

  return (
    <ReportPreviewView
      views={listQuery.data ?? []}
      currentViewId={viewId}
      listStatus={viewListStatus(listQuery.isPending, listQuery.isError)}
      view={view}
      status={status}
      errorMessage={status === "error" ? failureMessage(viewQuery.error) : null}
      listError={
        status === "ready" &&
        listQuery.isError &&
        trpcCode(listQuery.error) !== "NOT_IMPLEMENTED"
          ? failureMessage(listQuery.error)
          : null
      }
      canEdit={Boolean(profile && view && canEditView(profile, view))}
      generatePending={
        exportForThisView && (generate.isPending || link.isPending)
      }
      generateError={exportFailureMessage(
        exportForThisView,
        link.isError,
        generate.error,
      )}
      downloadUrl={
        exportForThisView && link.isSuccess ? (link.data ?? null) : null
      }
      onSelectView={(nextViewId) => {
        void navigate({
          to: "/reports/preview/$viewId",
          params: { viewId: nextViewId },
        });
      }}
      onRetry={() => {
        void viewQuery.refetch();
        void listQuery.refetch();
      }}
      onExport={exportReport}
    />
  );
}

function exportFailureMessage(
  forThisView: boolean,
  linkFailed: boolean,
  error: unknown,
): string | null {
  if (forThisView && linkFailed) return DOWNLOAD_LINK_FAILED;
  if (forThisView && error) return failureMessage(error);
  return null;
}

function viewListStatus(pending: boolean, error: boolean): ViewListStatus {
  if (pending) return "loading";
  if (error) return "error";
  return "ready";
}

function previewStatus(pending: boolean, error: unknown): ReportPreviewStatus {
  if (pending) return "loading";
  if (!error) return "ready";
  if (trpcCode(error) === "NOT_FOUND") return "not-found";
  // Nothing to draw until this endpoint returns a view. Retrying cannot produce one.
  if (trpcCode(error) === "NOT_IMPLEMENTED") return "empty";
  return "error";
}

function failureMessage(error: unknown): string {
  switch (trpcCode(error)) {
    case "NOT_FOUND":
      return "That view does not exist.";
    case "BAD_REQUEST":
      return "The report file could not be saved.";
    case "CONFLICT":
      return "That report was already recorded. Try again.";
    case "NOT_IMPLEMENTED":
      return "This is not available yet.";
    default:
      return error instanceof Error ? error.message : "Something went wrong.";
  }
}

function trpcCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
