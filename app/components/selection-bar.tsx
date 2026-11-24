import type { ReactNode } from "react";

// Shared by the Review table and Booking Archives so their bulk-action bars look and behave the same:
// "N selected" + Clear on the left, then View / Print / Download / Delete (or Cancel) on the right.
// The bar is sticky, so it stays at the bottom of the screen instead of at the end of a long table.
const BTN =
  "rounded-md px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40";
export const barPrimary = `${BTN} bg-accent-1 hover:opacity-90`;
export const barDanger = `${BTN} bg-red-600 hover:bg-red-700`;
const barOutline =
  "rounded-md border border-accent-1 bg-container px-4 py-1.5 text-sm font-semibold text-accent-1 hover:bg-accent-4";

export function SelectionBar({
  count,
  onClear,
  children,
  className = "",
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-end gap-3 rounded-lg border-t border-accent-6 bg-container px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] ${className}`}>
      <p className="mr-auto text-sm" aria-live="polite">
        <strong>{count}</strong> selected
        <button type="button" onClick={onClear} className={`ml-3 ${barOutline}`}>
          Clear
        </button>
      </p>
      {children}
    </div>
  );
}
