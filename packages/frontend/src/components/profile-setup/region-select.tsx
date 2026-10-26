import { userRegions } from "@repo/common";
import type { UserRegion } from "@repo/common";
import { Label } from "@frontend/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";

interface RegionSelectProps {
  value: UserRegion | "";
  onChange: (value: UserRegion) => void;
  error?: string | null;
}

// to show the label as "United States" in the UI when the backend region value is "US"
const REGION_LABELS: Partial<Record<UserRegion, string>> = {
  US: "United States",
};

function getRegionLabel(region: UserRegion): string {
  return REGION_LABELS[region] ?? region;
}

// so it can match the figma update with Australia starting first
const SORTED_REGIONS = [...userRegions].sort((a, b) =>
  getRegionLabel(a).localeCompare(getRegionLabel(b)),
);

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor="region-trigger"
        className="text-sm font-semibold color-[#1C1917]"
      >
        Region
      </Label>
      <Select
        name="region"
        value={value}
        onValueChange={(val) => onChange(val as UserRegion)}
      >
        <SelectTrigger
          id="region-trigger"
          data-testid="region"
          className="h-17.5! w-full justify-center gap-2 rounded-[0.625em]! border-2 border-[#D9D9D9] bg-white px-4 text-base text-black! shadow-none data-placeholder:text-black! **:data-[slot=select-value]:text-black! [&_span]:text-black! [&_svg]:text-black! [&_svg]:opacity-100! focus:ring-[#C75C3B]"
        >
          <SelectValue placeholder="Choose region" />
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={4}
          className="w-(--radix-select-trigger-width) overflow-hidden rounded-[0.875em] border border-[#D9D9D9] bg-white p-0 text-black shadow-[0_0.25rem_0.25rem_0_rgba(0,0,0,0.25)]"
        >
          {SORTED_REGIONS.map((region) => (
            <SelectItem
              key={region}
              value={region}
              className="h-7 cursor-pointer rounded-none px-4 text-sm text-black hover:bg-gray-100 focus:bg-gray-100 focus:text-black"
            >
              {getRegionLabel(region)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
