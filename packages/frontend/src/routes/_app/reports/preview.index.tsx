import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReportPreviewView } from "@frontend/components/reports/ReportPreviewView.tsx";
import { pageTitle } from "@frontend/lib/pageTitle.ts";
import {
  failureMessage,
  trpcCode,
  viewListStatus,
} from "@frontend/lib/reportPreviewErrors.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/**
 * The report preview with no view chosen yet. Choosing a view moves to
 * `/reports/preview/$viewId`, so every preview can be linked to and reloaded.
 */
export const Route = createFileRoute("/_app/reports/preview/")({
  head: () => pageTitle("Report preview"),
  component: ReportPreviewEmpty,
});

function ReportPreviewEmpty() {
  const navigate = useNavigate();
  const listQuery = useQuery(trpc.views.list.queryOptions());

  return (
    <ReportPreviewView
      views={listQuery.data ?? []}
      currentViewId={null}
      listStatus={viewListStatus(listQuery.isPending, listQuery.isError)}
      view={null}
      status="no-selection"
      errorMessage={null}
      listError={
        listQuery.isError && trpcCode(listQuery.error) !== "NOT_IMPLEMENTED"
          ? failureMessage(listQuery.error)
          : null
      }
      canEdit={false}
      generatePending={false}
      generateError={null}
      downloadUrl={null}
      onSelectView={(viewId) => {
        void navigate({ to: "/reports/preview/$viewId", params: { viewId } });
      }}
      onRetry={() => {
        void listQuery.refetch();
      }}
      onExport={noop}
    />
  );
}

// Nothing is selected, so the export button is always disabled.
function noop() {}
