import { cn } from "cn";
import { userRegions } from "@repo/common";
import type {
  ChartDefinition,
  ChartId,
  UserRegion,
  UtcDateString,
} from "@repo/common";
import {
  CalendarBlankIcon,
  CaretDownIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Calendar } from "@frontend/components/ui/calendar.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@frontend/components/ui/chart.tsx";
import type { ChartConfig } from "@frontend/components/ui/chart.tsx";
import { Checkbox } from "@frontend/components/ui/checkbox.tsx";
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
  RadioGroup,
  RadioGroupItem,
} from "@frontend/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import {
  CHART_TYPES,
  FIELDS,
  changeChartType,
  chartToForm,
  formToChart,
  newChartForm,
  paramsOf,
  resolveDates,
} from "@frontend/lib/chartForm.ts";
import type {
  Ago,
  Channel,
  ChartForm,
  DateControl,
  Field,
  ParamKey,
} from "@frontend/lib/chartForm.ts";
import { EMAIL_CAMPAIGN_METRIC_LABELS } from "@frontend/lib/emailMetrics.ts";
import { trpc } from "@frontend/lib/trpc.ts";

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
        <ChartEditor initial={initial} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}

function ChartEditor({
  initial,
  onSave,
}: Pick<ChartEditorDialogProps, "initial" | "onSave">) {
  // editing skips the add step and goes straight to customize
  const [channel, setChannel] = useState<Channel | undefined>(
    initial && CHART_TYPES[initial.chartId].channel,
  );

  return channel ? (
    <ChartEditorForm initial={initial} channel={channel} onSave={onSave} />
  ) : (
    <AddAnalyticStep onNext={setChannel} />
  );
}

function EditorHeader({ title }: { title: string }) {
  return (
    <DialogHeader className="flex-row items-center justify-between border-b px-11 py-7">
      <DialogTitle className="text-2xl font-medium">{title}</DialogTitle>
      <DialogClose asChild>
        <Button type="button" variant="ghost" size="icon-lg">
          <XIcon className="size-8" weight="light" />
          <span className="sr-only">Close</span>
        </Button>
      </DialogClose>
    </DialogHeader>
  );
}

function CancelButton() {
  return (
    <DialogClose asChild>
      <Button
        type="button"
        variant="outline"
        className="w-18 border-primary text-primary hover:bg-primary/10 hover:text-primary"
      >
        Cancel
      </Button>
    </DialogClose>
  );
}

const CHANNELS: Record<Channel, { name: string; pill: string }> = {
  INSTAGRAM: { name: "Instagram Views", pill: "Instagram" },
  WEBSITE: { name: "Website Views", pill: "Website" },
  EMAIL: { name: "Email Views", pill: "Email" },
  LINKEDIN: { name: "Linkedin Views", pill: "Linkedin" },
};

const chartIdsOf = (channel: Channel) =>
  (Object.keys(CHART_TYPES) as ChartId[]).filter(
    (chartId) => CHART_TYPES[chartId].channel === channel,
  );

// figma's radio is an orange ring with an orange dot, not a filled circle
const RADIO =
  "border-primary data-checked:bg-transparent [&_[data-slot=radio-group-indicator]>span]:bg-primary";

function AddAnalyticStep({ onNext }: { onNext: (channel: Channel) => void }) {
  const [picked, setPicked] = useState<Channel>();
  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const rows = (Object.keys(CHANNELS) as Channel[]).filter(
    (channel) =>
      (channels.length === 0 || channels.includes(channel)) &&
      CHANNELS[channel].name
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <>
      <EditorHeader title="Add New Analytic" />
      <div className="flex flex-col gap-6 px-11 py-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search analytics"
              aria-label="Search analytics"
              className="h-10 pl-9 text-base shadow-none md:text-base"
            />
          </div>
          <CheckboxFilter
            label="Channel"
            options={(Object.keys(CHANNELS) as Channel[]).map((channel) => ({
              value: channel,
              label: CHANNELS[channel].pill,
            }))}
            value={channels}
            onChange={setChannels}
          />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No analytics match your filters
          </p>
        ) : (
          <RadioGroup
            aria-label="Analytic"
            value={picked ?? ""}
            onValueChange={(next) => setPicked(next as Channel)}
            className="flex flex-col gap-0 rounded-md border"
          >
            {rows.map((channel) => {
              // a channel can only be picked once it has chart types
              const enabled = chartIdsOf(channel).length > 0;
              return (
                <label
                  key={channel}
                  className={cn(
                    "flex items-center gap-5 border-b px-6 py-5 last:border-b-0",
                    enabled
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50",
                  )}
                >
                  <RadioGroupItem
                    value={channel}
                    disabled={!enabled}
                    className={RADIO}
                  />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-base">{CHANNELS[channel].name}</span>
                    <span className="text-sm text-muted-foreground">
                      Description
                    </span>
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-sm">
                    {CHANNELS[channel].pill}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        )}

        <DialogFooter>
          <CancelButton />
          <Button
            type="button"
            disabled={!picked}
            className="w-34"
            onClick={() => {
              if (picked) onNext(picked);
            }}
          >
            Next
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}

const FIELD = "flex flex-col gap-2";
const FIELD_LABEL = "text-base font-normal text-foreground";
const SELECT_TRIGGER = "w-75 data-[size=default]:h-10 text-base shadow-none";

function ChartEditorForm({
  initial,
  channel,
  onSave,
}: Pick<ChartEditorDialogProps, "initial" | "onSave"> & { channel: Channel }) {
  const [form, setForm] = useState<ChartForm>(() =>
    initial ? chartToForm(initial) : newChartForm(chartIdsOf(channel)[0]),
  );
  // frozen when the editor opens, otherwise "now" changes every render and the
  // email query never settles
  const now = useMemo(() => new Date(), []);
  const id = useId();
  const chart = formToChart(form);
  const dates = resolveDates(form, now);
  const canSave = chart !== undefined && dates.inOrder;
  const params = paramsOf(form.chartId);
  const keysOf = (kind: Field["kind"]) =>
    params.filter((key) => FIELDS[key].kind === kind);
  const setValue = (key: ParamKey, value: unknown) =>
    setForm((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (chart && canSave) onSave(chart);
      }}
    >
      <EditorHeader title="Customize Analytic" />

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
              {chartIdsOf(channel).map((chartId) => (
                <SelectItem key={chartId} value={chartId}>
                  {CHART_TYPES[chartId].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {keysOf("METRIC").map((key) => (
          <div key={key} className={FIELD}>
            <span id={`${id}-${key}`} className={FIELD_LABEL}>
              Metric
            </span>
            <Select
              value={(form.values[key] as string | undefined) ?? ""}
              onValueChange={(next) => setValue(key, next)}
            >
              <SelectTrigger
                aria-labelledby={`${id}-${key}`}
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
        ))}

        {keysOf("DATE").length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-4">
              {keysOf("DATE").map((key) => {
                const field = FIELDS[key];
                return field.kind === "DATE" ? (
                  <DateField
                    key={key}
                    label={field.label}
                    value={form.values[key] as DateControl}
                    onChange={(next) => setValue(key, next)}
                  />
                ) : null;
              })}
            </div>
            {dates.inOrder ? null : (
              <p role="alert" className="text-sm text-destructive">
                Start must be before End.
              </p>
            )}
          </div>
        ) : null}

        {keysOf("EMAIL").map((key) => (
          <EmailPicker
            key={key}
            sentFrom={dates.from}
            sentTo={dates.to}
            ready={dates.complete && dates.inOrder}
            selectedId={form.values[key] as string | undefined}
            onSelect={(next) => setValue(key, next)}
          />
        ))}
        {keysOf("LIST").map((key) => (
          <ListPicker
            key={key}
            selectedId={form.values[key] as string | undefined}
            onSelect={(next) => setValue(key, next)}
          />
        ))}

        <ChartPreview
          title={form.title.trim()}
          caption={
            form.values.metric
              ? EMAIL_CAMPAIGN_METRIC_LABELS[form.values.metric]
              : CHART_TYPES[form.chartId].label
          }
          overTime={keysOf("DATE").some((key) => {
            const field = FIELDS[key];
            return field.kind === "DATE" && field.edge === "START";
          })}
        />

        <DialogFooter>
          <CancelButton />
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

const showDate = (date: UtcDateString) => format(new Date(date), "MMM d, yyyy");

function EmailPicker({
  sentFrom,
  sentTo,
  ready,
  selectedId,
  onSelect,
}: {
  sentFrom: UtcDateString | undefined;
  sentTo: UtcDateString | undefined;
  ready: boolean;
  selectedId: string | undefined;
  onSelect: (id?: string) => void;
}) {
  const [regions, setRegions] = useState<UserRegion[]>([]);
  const [search, setSearch] = useState("");
  const query = useQuery(
    trpc.emails.campaigns.queryOptions(
      ready && sentTo ? { ...(sentFrom && { sentFrom }), sentTo } : skipToken,
    ),
  );
  const inRegion = (query.data ?? []).filter(
    (email) => regions.length === 0 || regions.includes(email.region),
  );
  const shown = inRegion.filter((email) =>
    email.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  // search only hides rows while typing, so only dates and region clear the pick
  const pickGone =
    query.data !== undefined &&
    selectedId !== undefined &&
    !inRegion.some((email) => email.emailCampaignId === selectedId);
  useEffect(() => {
    if (pickGone) onSelect();
  }, [pickGone, onSelect]);

  let heading = "Emails";
  if (sentTo) {
    heading = sentFrom
      ? `Emails during ${showDate(sentFrom)} – ${showDate(sentTo)}`
      : `Emails sent by ${showDate(sentTo)}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-base">{heading}</span>
        <CheckboxFilter
          label="Region"
          options={userRegions.map((region) => ({
            value: region,
            label: region,
          }))}
          value={regions}
          onChange={setRegions}
        />
      </div>
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search emails"
          className="h-10 pl-9 text-base shadow-none md:text-base"
        />
      </div>
      {ready ? (
        <PickerList
          label={heading}
          query={query}
          items={shown.map((email) => ({
            id: email.emailCampaignId,
            name: email.name,
          }))}
          emptyMessage={
            query.data?.length === 0
              ? "No emails in this range"
              : "No emails match your filters"
          }
          errorMessage="Couldn't load emails."
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Choose valid dates to see emails.
        </p>
      )}
    </div>
  );
}

function ListPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (id?: string) => void;
}) {
  const query = useQuery(trpc.emails.lists.queryOptions());

  return (
    <div className="flex flex-col gap-3">
      <span className="text-base">Email lists</span>
      <PickerList
        label="Email lists"
        query={query}
        items={(query.data ?? []).map((list) => ({
          id: list.emailListId,
          name: list.name,
        }))}
        emptyMessage="No email lists"
        errorMessage="Couldn't load email lists."
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}

function PickerList({
  label,
  query,
  items,
  emptyMessage,
  errorMessage,
  selectedId,
  onSelect,
}: {
  label: string;
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  items: { id: string; name: string }[];
  emptyMessage: string;
  errorMessage: string;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-9" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        <span className="text-destructive">{errorMessage}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <RadioGroup
      aria-label={label}
      value={selectedId ?? ""}
      onValueChange={onSelect}
      className="flex max-h-60 flex-col gap-0 overflow-y-auto rounded-md border"
    >
      {items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
        >
          <RadioGroupItem value={item.id} className={RADIO} />
          {item.name}
        </label>
      ))}
    </RadioGroup>
  );
}

// an empty value means no filter
function CheckboxFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {label}
          <CaretDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-0 p-0">
        <p className="px-4 pt-4 pb-3 text-sm font-medium text-muted-foreground uppercase">
          {label}
        </p>
        <div className="flex flex-col gap-3 px-4 pb-4">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 text-sm"
            >
              <Checkbox
                checked={value.includes(option.value)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...value, option.value]
                      : value.filter((v) => v !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// placeholder numbers until the preview loads real chart data
const TEMPLATE_SERIES = [
  { at: "Jun", value: 820 },
  { at: "Jul", value: 932 },
  { at: "Aug", value: 901 },
  { at: "Sep", value: 1034 },
  { at: "Oct", value: 1190 },
  { at: "Nov", value: 1248 },
];
const TEMPLATE_VALUE = 1248;

function ChartPreview({
  title,
  caption,
  overTime,
}: {
  title: string;
  caption: string;
  overTime: boolean;
}) {
  const config = {
    value: { label: caption, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <section
      aria-label="Preview"
      className="flex flex-col gap-3 rounded-md border bg-muted/40 p-5"
    >
      <span className="text-base font-semibold">{title || "Untitled"}</span>
      {overTime ? (
        <ChartContainer config={config} className="h-48 w-full">
          <AreaChart data={TEMPLATE_SERIES} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="at" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div className="flex flex-col items-center gap-1 py-6">
          <span className="text-5xl font-semibold">
            {TEMPLATE_VALUE.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">{caption}</span>
        </div>
      )}
    </section>
  );
}
