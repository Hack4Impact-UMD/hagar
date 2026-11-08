import type { ChartWidth } from "@repo/common";
import {
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";

type ViewCardProps = {
  name: string;
  width: ChartWidth;
  /** Pass this in edit mode to show the remove button. */
  onRemove?: () => void;
  disabled?: boolean;
};

// Written out in full so Tailwind finds the classes.
const COLUMN_SPAN: Record<ChartWidth, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
};

/**
 * One analytic in a view, spanning as many grid columns as its chart kind is
 * wide. Charts aren't built yet, so a grey box stands in for the chart.
 */
export function ViewCard({ name, width, onRemove, disabled }: ViewCardProps) {
  return (
    <li
      className={cn(
        "relative flex h-[270px] flex-col gap-4 rounded-lg border-2 border-neutral-300 px-[17px] py-[15px]",
        COLUMN_SPAN[width],
      )}
    >
      {onRemove ? (
        <div className="flex items-center gap-1">
          {/* Styling only for now; dragging isn't built yet. */}
          <div
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary px-2 text-primary-foreground"
          >
            <DotsSixVerticalIcon weight="bold" className="size-4 shrink-0" />
          </div>
          <h2 className="min-w-0 flex-1">
            {/* Placeholder until the chart editor modal (#84) exists. It
                should open on this card's chart, and its onSave should
                replace the card in the draft. */}
            <button
              type="button"
              aria-label={`Edit ${name}`}
              disabled={disabled}
              className="flex h-6 w-full items-center gap-1 rounded-[10px] border border-[#E5E5E5] pr-1 pl-2 text-left hover:bg-muted disabled:opacity-50"
            >
              <span className="flex-1 truncate text-lg leading-none">
                {name}
              </span>
              <PencilSimpleIcon
                aria-hidden="true"
                className="size-5 shrink-0"
              />
            </button>
          </h2>
        </div>
      ) : (
        <h2 className="text-lg">{name}</h2>
      )}
      <div aria-hidden="true" className="flex-1 rounded-lg bg-neutral-200" />

      {/* Sits on the card's top-right corner, half outside the border. The
          white background hides the border line behind the icon. */}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          disabled={disabled}
          className="absolute -top-4 -right-4 rounded-full bg-background hover:text-destructive disabled:opacity-50"
        >
          <XCircleIcon aria-hidden="true" size={36} />
        </button>
      )}
    </li>
  );
}
