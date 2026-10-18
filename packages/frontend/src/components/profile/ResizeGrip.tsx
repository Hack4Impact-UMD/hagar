/**
 * The two diagonal lines the Figma draws in the corner of every input. They
 * are decoration only: the inputs can't be resized.
 */
export function ResizeGrip() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 7 7"
      className="pointer-events-none absolute right-1 bottom-1 size-1.75 stroke-black/40"
    >
      <line x1="7" y1="0" x2="0" y2="7" />
      <line x1="7" y1="4" x2="4" y2="7" />
    </svg>
  );
}
