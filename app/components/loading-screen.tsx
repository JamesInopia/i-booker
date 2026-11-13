export function Spinner({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-4 border-accent-6 border-t-accent-1 ${className}`}
    />
  );
}

/** Centered spinner + message. `fullScreen` covers the whole viewport (first load, auth checks). */
export function LoadingScreen({
  fullScreen = false,
  message = "Loading…",
}: {
  fullScreen?: boolean;
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
          : "flex min-h-[60vh] flex-col items-center justify-center gap-4"
      }
    >
      {fullScreen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/iacademy-cebu-logo.png" alt="" className="h-16 w-auto" />
      )}
      <Spinner />
      <p className="text-sm font-semibold text-accent-3">{message}</p>
    </div>
  );
}
