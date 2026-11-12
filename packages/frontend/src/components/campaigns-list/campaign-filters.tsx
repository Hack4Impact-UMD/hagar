import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { userRegions } from "@repo/common";
import {
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";
import type { CampaignStatus } from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  CHANNEL_LABELS,
  DATE_PRESET_LABELS,
  STATUS_DOT_CLASS,
  campaignStatuses,
  channels,
  datePresets,
} from "@frontend/components/campaigns-list/campaign-list.ts";
import type { CampaignSearch } from "@frontend/lib/campaignSearch.ts";

/** Changes the URL's search params. `replace` skips adding a history entry. */
export type UpdateSearch = (
  update: (prev: CampaignSearch) => CampaignSearch,
  options?: { replace?: boolean },
) => void;

// A filter list with nothing picked is left out of the URL entirely.
function orUndefined<T>(list: T[]): T[] | undefined {
  return list.length > 0 ? list : undefined;
}

const TRIGGER =
  "inline-flex h-[2.125rem] cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const TRIGGER_IDLE = "border-[#D9D4CE] bg-white text-[#1F1F1F]";
const TRIGGER_ACTIVE = "border-primary bg-[#F6E6DC] text-[#9A3F22]";
const PANEL =
  "min-w-56 rounded-xl border-[#D9D4CE] bg-white p-0 shadow-[0_12px_32px_0_rgba(0,0,0,0.12)]";
const PANEL_LABEL =
  "px-4 pt-4 pb-2 text-xs font-semibold tracking-wide text-[#6B6B6B] uppercase";

function FilterTrigger({
  label,
  active,
  count,
  testId,
}: {
  label: string;
  active: boolean;
  count?: number;
  testId: string;
}) {
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        data-testid={testId}
        className={`${TRIGGER} ${active ? TRIGGER_ACTIVE : TRIGGER_IDLE}`}
      >
        {label}
        {count ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[0.6875rem] leading-none font-semibold text-primary-foreground">
            {count}
          </span>
        ) : null}
        <CaretDownIcon className="size-3" />
      </button>
    </DropdownMenuTrigger>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  // Typed text lives here so the cursor doesn't jump while the URL catches
  // up. The URL only wins when it changes from elsewhere, such as "Clear all",
  // which can't happen while someone is typing in the box.
  const [text, setText] = useState(value);
  useEffect(() => {
    if (document.activeElement !== input.current) setText(value);
  }, [value]);

  return (
    <div className="relative w-[13.5rem]">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
      <Input
        ref={input}
        type="search"
        aria-label="Search campaigns by name"
        placeholder="Search"
        data-testid="campaign-search"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(event.target.value);
        }}
        className="h-[2.125rem] rounded-md border-[#D9D4CE] bg-white pl-9 text-sm shadow-none"
      />
    </div>
  );
}

function DateFilter({
  search,
  setSearch,
}: {
  search: CampaignSearch;
  setSearch: UpdateSearch;
}) {
  const selected = search.date ?? "ALL_TIME";
  return (
    <DropdownMenu>
      <FilterTrigger
        label="Date"
        active={selected !== "ALL_TIME"}
        testId="campaign-filter-date"
      />
      <DropdownMenuContent align="start" className={`${PANEL} pb-2`}>
        <DropdownMenuLabel className={PANEL_LABEL}>
          Date range
        </DropdownMenuLabel>
        {datePresets.map((preset) => (
          <DropdownMenuItem
            key={preset}
            data-selected={preset === selected || undefined}
            onSelect={() =>
              setSearch((prev) => ({
                ...prev,
                date: preset === "ALL_TIME" ? undefined : preset,
              }))
            }
            className="mx-2 cursor-pointer rounded-md px-2 py-2 text-[0.9375rem] text-[#1F1F1F] focus:bg-[#F9F7F4] data-selected:bg-[#F6E6DC] data-selected:text-[#9A3F22]"
          >
            {DATE_PRESET_LABELS[preset]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
  renderOption,
  testId,
}: {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  renderOption: (option: T) => ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  // Built from `options` so the URL lists choices in a fixed order.
  const toggle = (option: T) =>
    onChange(
      options.filter((o) =>
        o === option ? !selected.includes(o) : selected.includes(o),
      ),
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <FilterTrigger
        label={label}
        active={selected.length > 0}
        count={selected.length}
        testId={testId}
      />
      <DropdownMenuContent align="start" className={PANEL}>
        <DropdownMenuLabel className={PANEL_LABEL}>{label}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => toggle(option)}
            // Keeps the panel open so several options can be picked in a row.
            onSelect={(event) => event.preventDefault()}
            // The built-in check mark sits on the right; the design puts a
            // filled box on the left instead.
            className="group mx-2 cursor-pointer gap-3 rounded-md px-2 py-2 text-[0.9375rem] text-[#1F1F1F] focus:bg-[#F9F7F4] [&>[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden"
          >
            <span
              aria-hidden="true"
              className="flex size-4 items-center justify-center rounded-[0.25rem] border border-[#BCB4AB] group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
            >
              <CheckIcon
                weight="bold"
                className="size-3 text-primary-foreground opacity-0 group-data-[state=checked]:opacity-100"
              />
            </span>
            {renderOption(option)}
          </DropdownMenuCheckboxItem>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-[#ECE8E3] px-4 py-3">
          <button
            type="button"
            onClick={() => onChange([])}
            className="cursor-pointer text-sm text-[#6B6B6B]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-8 cursor-pointer rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The search box and filter dropdowns above the table. */
export function CampaignFilterBar({
  search,
  setSearch,
}: {
  search: CampaignSearch;
  setSearch: UpdateSearch;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox
        value={search.q ?? ""}
        onChange={(text) =>
          // One history entry per keystroke would make Back unusable.
          setSearch(
            (prev) => ({ ...prev, q: text === "" ? undefined : text }),
            {
              replace: true,
            },
          )
        }
      />
      <DateFilter search={search} setSearch={setSearch} />
      <MultiSelectFilter
        label="Status"
        testId="campaign-filter-status"
        options={campaignStatuses}
        selected={search.status ?? []}
        onChange={(next) =>
          setSearch((prev) => ({ ...prev, status: orUndefined(next) }))
        }
        renderOption={(status: CampaignStatus) => (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${STATUS_DOT_CLASS[status]}`}
            />
            {status}
          </span>
        )}
      />
      <MultiSelectFilter
        label="Region"
        testId="campaign-filter-region"
        options={userRegions}
        selected={search.region ?? []}
        onChange={(next) =>
          setSearch((prev) => ({ ...prev, region: orUndefined(next) }))
        }
        renderOption={(region) => region}
      />
      <MultiSelectFilter
        label="Channel"
        testId="campaign-filter-channel"
        options={channels}
        selected={search.channel ?? []}
        onChange={(next) =>
          setSearch((prev) => ({ ...prev, channel: orUndefined(next) }))
        }
        renderOption={(channel) => CHANNEL_LABELS[channel]}
      />
    </div>
  );
}

type Chip = {
  key: string;
  label: string;
  remove: (prev: CampaignSearch) => CampaignSearch;
};

function without<T>(list: readonly T[] | undefined, value: T) {
  return orUndefined((list ?? []).filter((item) => item !== value));
}

function activeChips(search: CampaignSearch): Chip[] {
  const chips: Chip[] = [];
  if (search.date) {
    chips.push({
      key: "date",
      label: DATE_PRESET_LABELS[search.date],
      remove: (prev) => ({ ...prev, date: undefined }),
    });
  }
  for (const status of search.status ?? []) {
    chips.push({
      key: `status-${status}`,
      label: status,
      remove: (prev) => ({ ...prev, status: without(prev.status, status) }),
    });
  }
  for (const region of search.region ?? []) {
    chips.push({
      key: `region-${region}`,
      label: region,
      remove: (prev) => ({ ...prev, region: without(prev.region, region) }),
    });
  }
  for (const channel of search.channel ?? []) {
    chips.push({
      key: `channel-${channel}`,
      label: CHANNEL_LABELS[channel],
      remove: (prev) => ({ ...prev, channel: without(prev.channel, channel) }),
    });
  }
  return chips;
}

/** "Showing X of Y campaigns", a removable chip per filter, and Clear all. */
export function CampaignFilterChips({
  search,
  shown,
  total,
  setSearch,
  onClearAll,
}: {
  search: CampaignSearch;
  shown: number;
  total: number;
  setSearch: UpdateSearch;
  onClearAll: () => void;
}) {
  const chips = activeChips(search);
  const filtered = chips.length > 0 || search.q !== undefined;

  return (
    <div
      data-testid="campaign-filter-chips"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="text-[#6B6B6B]">
        Showing {shown} of {total} {total === 1 ? "campaign" : "campaigns"}
      </span>
      {filtered ? (
        <span aria-hidden="true" className="h-4 w-px bg-[#D9D4CE]" />
      ) : null}
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-2 rounded-full bg-[#F1DED2] py-1 pr-2.5 pl-3 text-[0.8125rem] font-medium text-[#8A3B1F]"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => setSearch(chip.remove)}
            className="cursor-pointer rounded-sm"
          >
            <XIcon weight="bold" className="size-2.5 text-[#8A3B1F]/80" />
          </button>
        </span>
      ))}
      {filtered ? (
        <button
          type="button"
          data-testid="campaign-clear-filters"
          onClick={onClearAll}
          className="cursor-pointer text-primary"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
