import { requireUser } from "@/lib/auth";
import { requireStep } from "../flow";
import { formatBlocks, formatDate, manilaNow } from "../rules";
import { StepFrame } from "../step-page";
import { SubmitForm } from "./submit-form";

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
    <div className={`flex min-w-0 flex-col ${className}`}>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="mt-1 min-h-9 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-md border border-accent-6 bg-container px-3 py-1.5 text-sm">
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

export default async function ReviewAndSubmitPage() {
  const user = await requireUser();
  const { draft, room, natures } = await requireStep(3);

  return (
    <StepFrame
      step={3}
      subtitle="Check your request. Use Back to change anything."
    >
      <h2 className="mt-6 text-lg font-bold">Nature of Activity</h2>
      <ul
        aria-label="Nature of activity"
        className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {natures.map((n) => {
          const checked = n.id === draft.nature;
          return (
            <li
              key={n.id}
              className={`flex min-w-0 items-center gap-2 text-sm font-semibold ${
                n.other ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <Box checked={checked} />

              <span className="shrink-0">
                {n.name}
                {n.other && "; please specify:"}
                {checked && <span className="sr-only"> (selected)</span>}
              </span>

              {n.other && (
                <span className="min-w-0 w-full max-w-md flex-1 self-end break-words border-b border-accent-3/60 px-1 pb-0.5 font-normal">
                  {checked ? draft.natureOther : ""}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 text-lg font-bold">Details of Request</h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Value label="Requestor">{user.name || user.email}</Value>
        <Value label="Contact Details">{draft.contactNo}</Value>
        <Value label="Program / Course">{draft.program}</Value>
        <Value label="Date Filed">{formatDate(manilaNow().date)}</Value>
      </dl>

      <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.8fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
        <Value label="Date of Activity">{formatDate(draft.date)}</Value>
        <Value label="Time">{formatBlocks(draft.blocks)}</Value>
        <Value label="Venue">{room.name}</Value>
        <Value label="# of Participants">{draft.occupants}</Value>
        <Value
          label="Details of the Activity"
          className="min-w-0 sm:col-span-2 lg:col-span-4"
        >
          {draft.description}
        </Value>
      </dl>

      <SubmitForm editing={Boolean(draft.requestId)} />
    </StepFrame>
  );
}
