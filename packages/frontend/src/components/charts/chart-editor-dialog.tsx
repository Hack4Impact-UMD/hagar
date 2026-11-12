import type {
  ChartDefinition,
  ChartId,
  EmailCampaignMetric,
} from "@repo/common";
import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useId, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Calendar } from "@frontend/components/ui/calendar.tsx";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover.tsx";
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
  startIsBeforeEnd,
} from "@frontend/lib/chartForm.ts";
import type { Ago, ChartForm, DateControl } from "@frontend/lib/chartForm.ts";
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
  const inOrder = startIsBeforeEnd(form, new Date());
  const canSave = chart !== undefined && inOrder;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (chart && canSave) onSave(chart);
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

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            {CHART_TYPES[form.chartId].dates === "AS_OF" ? (
              <DateField
                label="As of"
                value={form.asOf}
                onChange={(asOf) => setForm({ ...form, asOf })}
              />
            ) : (
              <>
                <DateField
                  label="Start"
                  value={form.start}
                  onChange={(start) => setForm({ ...form, start })}
                />
                <DateField
                  label="End"
                  value={form.end}
                  onChange={(end) => setForm({ ...form, end })}
                />
              </>
            )}
          </div>
          {inOrder ? null : (
            <p role="alert" className="text-sm text-destructive">
              Start must be before End.
            </p>
          )}
        </div>

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
          <Button type="submit" disabled={!canSave} className="w-34">
            Save
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}

type DateChoice = "FIXED" | "NOW" | Ago["unit"];

const DATE_CHOICES: { value: DateChoice; label: string }[] = [
  { value: "FIXED", label: "Fixed date" },
  { value: "NOW", label: "Now" },
  { value: "DAY", label: "Days ago" },
  { value: "WEEK", label: "Weeks ago" },
  { value: "MONTH", label: "Months ago" },
  { value: "YEAR", label: "Years ago" },
];

function choiceOf(control: DateControl): DateChoice {
  if (control.mode === "FIXED") return "FIXED";
  return control.ago?.unit ?? "NOW";
}

function withChoice(control: DateControl, choice: DateChoice): DateControl {
  if (choice === "FIXED") return { mode: "FIXED", date: undefined };
  if (choice === "NOW") return { mode: "RELATIVE", ago: undefined };
  // keeps the number when only the unit changes, so 3 weeks ago -> 3 months ago
  const amount =
    control.mode === "RELATIVE" && control.ago ? control.ago.amount : 1;
  return { mode: "RELATIVE", ago: { amount, unit: choice } };
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateControl;
  onChange: (next: DateControl) => void;
}) {
  const id = useId();
  const ago = value.mode === "RELATIVE" ? value.ago : undefined;

  return (
    <div className="flex w-60 flex-col gap-2">
      <span id={id} className="text-sm text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-2">
        {ago ? (
          <Input
            type="number"
            min={1}
            max={10000}
            step={1}
            aria-label={`${label} amount`}
            value={Number.isNaN(ago.amount) ? "" : ago.amount}
            onChange={(event) =>
              onChange({
                mode: "RELATIVE",
                ago: { ...ago, amount: event.target.valueAsNumber },
              })
            }
            className="h-10 w-18 text-base font-semibold shadow-none md:text-base"
          />
        ) : null}
        <Select
          value={choiceOf(value)}
          onValueChange={(next) =>
            onChange(withChoice(value, next as DateChoice))
          }
        >
          <SelectTrigger
            aria-labelledby={id}
            className="flex-1 text-base shadow-none data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {DATE_CHOICES.map((choice) => (
              <SelectItem key={choice.value} value={choice.value}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value.mode === "FIXED" ? (
        <FixedDatePicker
          labelId={id}
          date={value.date}
          onChange={(date) => onChange({ mode: "FIXED", date })}
        />
      ) : null}
    </div>
  );
}

function FixedDatePicker({
  labelId,
  date,
  onChange,
}: {
  labelId: string;
  date: Date | undefined;
  onChange: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-labelledby={`${labelId} ${id}`}
          className="h-10 justify-start text-base font-semibold shadow-none"
        >
          <CalendarBlankIcon />
          {date ? (
            format(date, "MMM d, yyyy")
          ) : (
            <span className="font-normal text-muted-foreground">
              Pick a date
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={date}
          defaultMonth={date}
          onSelect={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
