import type { UpdateProfileInput } from "@repo/common";

const EDITABLE_FIELDS = ["firstName", "lastName", "phoneNumber"] as const;

/**
 * The editable text fields whose submitted value differs from the profile, so
 * a save only sends what the user actually changed.
 */
export function changedFields(
  current: Record<(typeof EDITABLE_FIELDS)[number], string>,
  form: FormData,
): UpdateProfileInput {
  const changes: UpdateProfileInput = {};
  for (const field of EDITABLE_FIELDS) {
    const value = String(form.get(field)).trim();
    if (value !== current[field]) changes[field] = value;
  }
  return changes;
}
