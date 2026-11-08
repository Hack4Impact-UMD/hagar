import type { View } from "@repo/common";
import { CaretDownIcon, PlusCircleIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";

type ViewPickerProps = {
  views: View[];
  selectedId: string;
  onSelect: (viewId: string) => void;
  onNewView: () => void;
  disabled?: boolean;
};

const ITEM_CLASS = "rounded-none px-3 py-2 text-sm focus:bg-sidebar";

export function ViewPicker({
  views,
  selectedId,
  onSelect,
  onNewView,
  disabled,
}: ViewPickerProps) {
  const selected = views.find((v) => v.viewId === selectedId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label="Choose a view"
        className="group flex h-8 w-41.5 items-center justify-center gap-1 rounded-sm border border-primary bg-white px-2.5 text-sm font-medium text-primary disabled:opacity-50"
      >
        <span className="truncate">{selected?.name}</span>
        <CaretDownIcon
          weight="bold"
          className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-lg p-0 shadow-lg">
        <DropdownMenuRadioGroup value={selectedId} onValueChange={onSelect}>
          {views.map((view) => (
            <DropdownMenuRadioItem
              key={view.viewId}
              value={view.viewId}
              className={`${ITEM_CLASS} data-[state=checked]:bg-sidebar [&_svg]:size-5 [&_svg]:text-primary`}
            >
              <span className="truncate">{view.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuItem
          onSelect={onNewView}
          className={`${ITEM_CLASS} justify-between text-primary focus:text-primary`}
        >
          New view
          <PlusCircleIcon className="size-5 text-primary" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
