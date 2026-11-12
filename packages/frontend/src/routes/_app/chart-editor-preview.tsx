import type { ChartDefinition } from "@repo/common";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChartEditorDialog } from "@frontend/components/charts/chart-editor-dialog.tsx";
import { Button } from "@frontend/components/ui/button.tsx";

// temp page before editor is wired in
export const Route = createFileRoute("/_app/chart-editor-preview")({
  component: ChartEditorPreview,
});

type SavedChart = { id: string; chart: ChartDefinition };

function ChartEditorPreview() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  // id of the chart being edited, "new" while adding, or null when closed.
  const [editing, setEditing] = useState<string | null>(null);
  const edited = charts.find((saved) => saved.id === editing);

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Chart editor preview</h1>
      <Button className="self-start" onClick={() => setEditing("new")}>
        Add analytic
      </Button>

      <ul className="flex flex-col gap-2">
        {charts.map(({ id, chart }) => (
          <li key={id}>
            <button
              type="button"
              className="w-full cursor-pointer rounded-md border p-3 text-left hover:bg-muted"
              onClick={() => setEditing(id)}
            >
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(chart, null, 2)}
              </pre>
            </button>
          </li>
        ))}
      </ul>

      <ChartEditorDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        initial={edited?.chart}
        onSave={(chart) => {
          setCharts((current) =>
            edited
              ? current.map((saved) =>
                  saved.id === edited.id ? { ...saved, chart } : saved,
                )
              : [...current, { id: crypto.randomUUID(), chart }],
          );
          setEditing(null);
        }}
      />
    </main>
  );
}
