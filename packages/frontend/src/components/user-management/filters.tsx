import type { UserRegion, UserRole } from "@repo/common";
import { userRegions } from "@repo/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { userRoles } from "@common/user-helpers.ts";

// Radix Select can't use an empty string as an item value, so "no filter" needs a sentinel.
const ALL = "all";

/* The orange pill style the design uses for filter and edit dropdowns */
export const pillTriggerClass =
  "border-primary bg-primary text-primary-foreground shadow-none hover:bg-primary/90 data-placeholder:text-primary-foreground [&_svg]:text-primary-foreground!";

interface RegionFilterProps {
  value: UserRegion | undefined;
  onChange: (region: UserRegion | undefined) => void;
}

/* Only shown to Global Admins; Local Admins only ever see their own region */
export function RegionFilter({ value, onChange }: RegionFilterProps) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) =>
        onChange(next === ALL ? undefined : (next as UserRegion))
      }
    >
      <SelectTrigger
        size="sm"
        aria-label="Filter by region"
        data-testid="region-filter"
        className={pillTriggerClass}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>All regions</SelectItem>
        {userRegions.map((region) => (
          <SelectItem key={region} value={region}>
            {region}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface RoleFilterProps {
  value: UserRole | null;
  onChange: (role: UserRole | null) => void;
}

export function RoleFilter({ value, onChange }: RoleFilterProps) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) =>
        onChange(next === ALL ? null : (next as UserRole))
      }
    >
      <SelectTrigger
        size="sm"
        aria-label="Filter by role"
        data-testid="role-filter"
        className={pillTriggerClass}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>All roles</SelectItem>
        {userRoles.map((role) => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
