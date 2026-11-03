import type { ArchiveDetail } from "@/lib/definitions";

function Field({
  label,
  children,
  className = "",
  tall = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  tall?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold">{label}</dt>
      <dd
        className={`mt-1 whitespace-pre-wrap wrap-break-word rounded-md border border-accent-6 bg-container px-4 py-2 text-sm ${
          tall ? "min-h-32" : "min-h-10"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

export default function RequestDetails({ d }: { d: ArchiveDetail }) {
  const purpose = d.natureOther ? `${d.nature}: ${d.natureOther}` : d.nature;

  return (
    <dl className="mt-4 grid gap-x-9 gap-y-4 md:grid-cols-2">
      <Field label="Requestor's Name">{d.requestor}</Field>
      <Field label="Requestor's Email">{d.email}</Field>

      <Field label="Date">{d.dateOfActivity}</Field>
      <Field label="Room">{d.venue}</Field>

      <Field label="Time">
        {d.startTime} - {d.endTime}
      </Field>
      <Field label="No. of Occupants">{d.participants}</Field>

      <Field label="Booking Purpose">{purpose}</Field>
      <Field label="Contact No.">{d.contactDetails}</Field>

      <Field label="Program">{d.program}</Field>
      <div className="hidden md:block" />

      <Field label="Booking Description" className="md:col-span-2" tall>
        {d.details}
      </Field>
    </dl>
  );
}
