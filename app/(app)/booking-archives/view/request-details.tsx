import type { ArchiveDetail } from "@/lib/definitions";
import { NATURES } from "../sample-details";

function Value({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="mt-1 min-h-9 whitespace-pre-wrap wrap-break-word rounded-md border border-accent-6 bg-container px-3 py-1.5 text-sm">
        {children}
      </dd>
    </div>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
        checked
          ? "border-accent-1 bg-accent-1 text-white"
          : "border-accent-3/50 bg-container"
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            d="m3 8.5 3.5 3.5L13 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export default function RequestDetails({ d }: { d: ArchiveDetail }) {
  return (
    <>
      <h2 className="text-lg font-bold">Nature of Activity</h2>
      <ul
        arla-label="Nature of Activity"
        className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {NATURES.map((n) => {
          const checked = n.name === d.nature;
          return (
            <li
              key={n.name}
              className={`flex items-center gap-2 text-sm font-semibold ${n.other ? "lg:col-span-2" : ""}`}
            >
              <Box checked={checked} />
              <span>
                {n.name}
                {n.other && "; please specify:"}
                {checked && <span className="sr-only"> (selected)</span>}
              </span>
              {n.other && (
                <span className="min-w-0 flex-1 wrap-break-word border-b border-accent-3/60 px-1 font-normal">
                  {checked ? d.natureOther : ""}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 text-lg font-bold">Details of Request</h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Value label="Requestor">{d.requestor}</Value>
        <Value label="Contact Details">{d.contactDetails}</Value>
        <Value label="Program / Course">{d.program}</Value>
        <Value label="Date Filed">{d.dateFiled}</Value>
      </dl>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1.5fr_1fr_2fr]">
        <Value label="Date of Activity">{d.dateOfActivity}</Value>
        <Value label="Start Time">{d.startTime}</Value>
        <Value label="End Time">{d.endTime}</Value>
        <Value label="Venue">{d.venue}</Value>
        <Value label="# of Participants">{d.participants}</Value>
        <Value
          label="Details of the Activity"
          className="sm:col-span-2 lg:col-span-1"
        >
          {d.details}
        </Value>
      </dl>
    </>
  );
}
