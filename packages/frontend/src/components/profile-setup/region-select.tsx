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
          className="h-14! w-full justify-center gap-2 rounded-[14px] border-gray-300 bg-white px-4 text-base text-black! shadow-none data-placeholder:text-black! **:data-[slot=select-value]:text-black! [&_span]:text-black! [&_svg]:text-black! [&_svg]:opacity-100! focus:ring-[#C75C3B]"
        >
          <SelectValue placeholder="Choose region" />
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={4}
          className="w-(--radix-select-trigger-width) rounded-[14px] border border-gray-200 bg-[#FFFFFF] p-1 text-black shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]" // matches figma exactly!
        >
          {SORTED_REGIONS.map((region) => (
            <SelectItem
              key={region}
              value={region}
              className="cursor-pointer rounded-md py-1 pl-2 pr-8 text-sm text-black focus:bg-gray-100 focus:text-black"
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
