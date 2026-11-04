import { XCircleIcon } from "@phosphor-icons/react";

type ViewCardProps = {
  name: string;
  /** Pass this in edit mode to show the remove button. */
  onRemove?: () => void;
  disabled?: boolean;
};

/**
 * One analytic in a view. Charts aren't built yet, so a grey box stands in
 * for the chart. The first card in a list spans the whole row.
 */
export function ViewCard({ name, onRemove, disabled }: ViewCardProps) {
  return (
    <li className="relative flex flex-col gap-4 rounded-lg border-2 border-neutral-300 p-4 md:first:col-span-3">
      <h2 className="text-lg">{name}</h2>
      <div aria-hidden="true" className="h-48 rounded-lg bg-neutral-200" />

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
