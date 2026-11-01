const SUMMARY = [
  { label: "Total Requests", value: "03" },
  { label: "Reservations in Schedule", value: "01" },
  { label: "Pending Approval", value: "01" },
  { label: "Requests in Review", value: "01" },
];

export function SummaryCounts() {
  return (
    <ul className="flex flex-wrap gap-4">
      {SUMMARY.map((s) => (
        <li key={s.label} className="flex w-28 flex-col items-center rounded-lg bg-container px-3 py-3 text-center shadow-sm">
          <span className="text-2xl font-bold">{s.value}</span>
          <span className="mt-1 text-xs font-semibold leading-tight">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}
