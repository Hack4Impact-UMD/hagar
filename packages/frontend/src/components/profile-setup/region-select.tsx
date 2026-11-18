import { userRegions } from "@repo/common";
import { cn } from "cn";
import type { UserRegion } from "@repo/common";
import { FIELD_LABEL } from "@frontend/components/form/FormField.tsx";
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

// The backend stores "US", but users should see the full name.
const REGION_LABELS: Partial<Record<UserRegion, string>> = {
  US: "United States",
};

function getRegionLabel(region: UserRegion): string {
  return REGION_LABELS[region] ?? region;
}

// Sorted by what users see, so "United States" lands under "U", not "US".
const SORTED_REGIONS = [...userRegions].sort((a, b) =>
  getRegionLabel(a).localeCompare(getRegionLabel(b)),
);

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor="region-trigger"
        className={cn(FIELD_LABEL, "items-start")}
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
          aria-invalid={error ? true : undefined}
          className="w-full gap-2 rounded-[0.625em] border-2 border-field-border bg-background px-4 text-base font-normal shadow-none data-[size=default]:h-12 sm:data-[size=default]:h-17.5 data-placeholder:text-inherit focus-visible:ring-0 [&_svg]:text-foreground"
        >
          <SelectValue placeholder="Choose region" />
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={4}
          className="w-(--radix-select-trigger-width) rounded-[0.875em] border border-field-border bg-background p-0 shadow-[0_0.25rem_0.25rem_0_rgba(0,0,0,0.25)]"
        >
          {SORTED_REGIONS.map((region) => (
            <SelectItem
              key={region}
              value={region}
              className="h-7 cursor-pointer rounded-none px-4"
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
