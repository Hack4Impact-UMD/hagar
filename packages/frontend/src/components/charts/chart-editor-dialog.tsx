import type {
  ChartDefinition,
  ChartId,
  EmailCampaignMetric,
} from "@repo/common";
import { XIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import { Label } from "@frontend/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import {
  CHART_TYPES,
  changeChartType,
  chartToForm,
  formToChart,
  newChartForm,
} from "@frontend/lib/chartForm.ts";
import type { ChartForm } from "@frontend/lib/chartForm.ts";
import { EMAIL_CAMPAIGN_METRIC_LABELS } from "@frontend/lib/emailMetrics.ts";

interface ChartEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // leave out when adding
  initial?: ChartDefinition;
  onSave: (chart: ChartDefinition) => void;
}

export function ChartEditorDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: ChartEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-180"
      >
        {/* content unmounts on close so each open starts fresh */}
        <ChartEditorForm initial={initial} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}

const FIELD = "flex flex-col gap-2";
const FIELD_LABEL = "text-base font-normal text-foreground";
const SELECT_TRIGGER = "w-75 data-[size=default]:h-10 text-base shadow-none";

function ChartEditorForm({
  initial,
  onSave,
}: Pick<ChartEditorDialogProps, "initial" | "onSave">) {
  const [form, setForm] = useState<ChartForm>(() =>
    initial ? chartToForm(initial) : newChartForm(),
  );
  const id = useId();
  const chart = formToChart(form);
  const isEmailChart = CHART_TYPES[form.chartId].picks === "EMAIL";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (chart) onSave(chart);
      }}
    >
      <DialogHeader className="flex-row items-center justify-between border-b px-11 py-7">
        <DialogTitle className="text-2xl font-medium">
          {initial ? "Customize Analytic" : "Add New Analytic"}
        </DialogTitle>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon-lg">
            <XIcon className="size-8" weight="light" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </DialogHeader>

      <div className="flex flex-col gap-6 px-11 py-8">
        <div className={FIELD}>
          <Label htmlFor={`${id}-title`} className={FIELD_LABEL}>
            Title
          </Label>
          <Input
            id={`${id}-title`}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            className="h-10 w-75 text-base font-semibold shadow-none md:text-base"
          />
        </div>

        <div className={FIELD}>
          <span id={`${id}-type`} className={FIELD_LABEL}>
            Chart type
          </span>
          <Select
            value={form.chartId}
            onValueChange={(next) =>
              setForm(changeChartType(form, next as ChartId))
            }
          >
            <SelectTrigger
              aria-labelledby={`${id}-type`}
              className={SELECT_TRIGGER}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {Object.entries(CHART_TYPES).map(([chartId, { label }]) => (
                <SelectItem key={chartId} value={chartId}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isEmailChart ? (
          <div className={FIELD}>
            <span id={`${id}-metric`} className={FIELD_LABEL}>
              Metric
            </span>
            <Select
              value={form.metric ?? ""}
              onValueChange={(next) =>
                setForm({ ...form, metric: next as EmailCampaignMetric })
              }
            >
              <SelectTrigger
                aria-labelledby={`${id}-metric`}
                className={SELECT_TRIGGER}
              >
                <SelectValue placeholder="Choose a metric" />
              </SelectTrigger>
              <SelectContent position="popper">
                {Object.entries(EMAIL_CAMPAIGN_METRIC_LABELS).map(
                  ([metric, label]) => (
                    <SelectItem key={metric} value={metric}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="w-18 border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={!chart} className="w-34">
            Save
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}
