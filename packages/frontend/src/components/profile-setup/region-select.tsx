import { userRegions, type UserRegion } from "@repo/common";
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

export function RegionSelect({ value, onChange, error }: RegionSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor="region-trigger"
        className="text-sm font-semibold text-gray-900"
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
          className="h-14 w-full rounded-xl border-gray-300 px-4 text-base shadow-none focus:ring-[#C85A32]"
        >
          <SelectValue placeholder="Choose region" />
        </SelectTrigger>
        <SelectContent>
          {userRegions.map((region) => (
            <SelectItem key={region} value={region} className="text-base">
              {region}
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