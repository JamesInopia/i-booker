"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-xl">Failed to load requests. Please try again...</p>
      <button
        onClick={reset}
        className="rounded-full bg-blue-900 px-6 py-2 font-semibold text-white"
      >
        Try Again
      </button>
    </div>
  );
}
