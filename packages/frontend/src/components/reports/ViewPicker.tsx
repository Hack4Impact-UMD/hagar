import type { View } from "@repo/common";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import { useCallback, useId, useMemo, useState } from "react";
import { Input } from "@frontend/components/ui/input.tsx";
import { filterViewsByName } from "@frontend/lib/viewSearch.ts";
import { cn } from "cn";

export type ViewListStatus = "loading" | "ready" | "error";

export type ViewPickerProps = {
  views: View[];
  currentViewId: string;
  listStatus: ViewListStatus;
  onSelect: (viewId: string) => void;
  disabled?: boolean;
};

export function ViewPicker({
  views,
  currentViewId,
  listStatus,
  onSelect,
  disabled = false,
}: ViewPickerProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredViews = useMemo(
    () => filterViewsByName(views, query),
    [views, query],
  );

  const syncActiveToCurrent = useCallback(() => {
    const index = filteredViews.findIndex((v) => v.viewId === currentViewId);
    setActiveIndex(index >= 0 ? index : 0);
  }, [filteredViews, currentViewId]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const selectView = useCallback(
    (viewId: string) => {
      onSelect(viewId);
      close();
    },
    [onSelect, close],
  );

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      close();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      syncActiveToCurrent();
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      close();
      event.preventDefault();
      return;
    }

    if (filteredViews.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      setActiveIndex((i) => (i + 1) % filteredViews.length);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      setActiveIndex(
        (i) => (i - 1 + filteredViews.length) % filteredViews.length,
      );
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" && open) {
      const view = filteredViews[activeIndex];
      if (view) {
        selectView(view.viewId);
      }
      event.preventDefault();
    }
  };

  const activeViewId = filteredViews[activeIndex]?.viewId;

  return (
    <div className="relative w-56" onBlur={handleBlur}>
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeViewId
            ? `${listboxId}-option-${activeViewId}`
            : undefined
        }
        aria-autocomplete="list"
        aria-label="Search views"
        placeholder="Search"
        disabled={disabled}
        value={query}
        className="h-8 bg-background pl-8 text-sm shadow-none focus-visible:border-border focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
        onFocus={() => {
          setOpen(true);
          syncActiveToCurrent();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover text-sm text-popover-foreground shadow-sm">
          {filteredViews.length === 0 && listStatus === "loading" && (
            <p className="px-3 py-1.5 text-muted-foreground">Loading views</p>
          )}
          {filteredViews.length === 0 && listStatus === "ready" && (
            <p className="px-3 py-1.5 text-muted-foreground">No views found</p>
          )}
          <ul id={listboxId} role="listbox">
            {filteredViews.map((view, index) => {
              const selected = view.viewId === currentViewId;
              const active = index === activeIndex;
              return (
                <li
                  key={view.viewId}
                  id={`${listboxId}-option-${view.viewId}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex cursor-default items-center justify-between gap-2 px-3 py-1.5",
                    (selected || active) && "bg-onboarding-icon-tile",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectView(view.viewId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectView(view.viewId);
                    }
                  }}
                >
                  <span className="truncate">{view.name}</span>
                  {selected && (
                    <CheckIcon
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t">
            <span
              aria-disabled="true"
              className="flex items-center gap-2 px-3 py-1.5 text-primary"
            >
              <PlusCircleIcon aria-hidden className="size-4 shrink-0" />
              New view
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
