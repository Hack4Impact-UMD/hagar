import { TRPCClientError } from "@trpc/client";
import type { ViewListStatus } from "@frontend/components/reports/ViewPicker.tsx";

export function viewListStatus(
  pending: boolean,
  error: boolean,
): ViewListStatus {
  if (pending) return "loading";
  if (error) return "error";
  return "ready";
}

export function failureMessage(error: unknown): string {
  switch (trpcCode(error)) {
    case "NOT_FOUND":
      return "That view does not exist.";
    case "BAD_REQUEST":
      return "The report file could not be saved.";
    case "CONFLICT":
      return "That report was already recorded. Try again.";
    case "NOT_IMPLEMENTED":
      return "This is not available yet.";
    default:
      return error instanceof Error ? error.message : "Something went wrong.";
  }
}

export function trpcCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
