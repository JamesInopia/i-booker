import { requireUser } from "@/lib/auth";
import { requireStep } from "../flow";
import { formatDate, formatTime, manilaNow } from "../rules";
import { StepFrame } from "../step-page";
import { SubmitForm } from "./submit-form";

function Value({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="mt-1 min-h-9 whitespace-pre-wrap break-words rounded-md border border-accent-6 bg-container px-3 py-1.5 text-sm">
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
        checked ? "border-accent-1 bg-accent-1 text-white" : "border-accent-3/50 bg-container"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m3 8.5 3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default async function ReviewAndSubmitPage() {
  const user = await requireUser();
  const { draft, room, natures } = await requireStep(4);

  return (
    <StepFrame step={4} subtitle="Check your request. Use Back to change anything.">
      <h2 className="mt-6 text-lg font-bold">Nature of Activity</h2>
      <ul aria-label="Nature of activity" className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {natures.map((n) => {
          const checked = n.id === draft.nature;
          return (
            <li key={n.id} className={`flex items-center gap-2 text-sm font-semibold ${n.other ? "lg:col-span-2" : ""}`}>
              <Box checked={checked} />
              <span>
                {n.name}
                {n.other && "; please specify:"}
                {checked && <span className="sr-only"> (selected)</span>}
              </span>
              {n.other && (
                <span className="min-w-0 flex-1 break-words border-b border-accent-3/60 px-1 font-normal">
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

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1.5fr_1fr_2fr]">
        <Value label="Date of Activity">{formatDate(draft.date)}</Value>
        <Value label="Start Time">{formatTime(draft.startTime)}</Value>
        <Value label="End Time">{formatTime(draft.endTime)}</Value>
        <Value label="Venue">{room.name}</Value>
        <Value label="# of Participants">{draft.occupants}</Value>
        <Value label="Details of the Activity" className="sm:col-span-2 lg:col-span-1">
          {draft.description}
        </Value>
      </dl>

      <SubmitForm />
    </StepFrame>
  );
}
