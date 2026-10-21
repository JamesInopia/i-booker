/*NOTE: THIS IS PLACEHOLDER TO VISUALIZE BOOKING PROCESS! WILL BE REPLACED DURING MERGING */
export default async function BookingStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string | string[] }>;
}) {
  const { submitted } = await searchParams;

  return (
    <main className="px-16 py-8">
      <h1 className="text-4xl font-bold">Booking Status page</h1>
      {submitted && (
        <p role="status" className="mt-6 rounded-md bg-accent-1/10 px-4 py-3 text-accent-1">
          Your request was submitted. The Admin Liaison will review it next.
        </p>
      )}
    </main>
  );
}
