"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { usePendingScreen } from "@/app/components/loading-provider";
import {
  REPORT_MAX_LENGTH,
  REPORT_NATURES,
  REPORT_MAX_FILES,
  REPORT_IMAGES_TYPES,
  REPORT_MAX_TOTAL_BYTES,
} from "@/lib/report";
import { submitReport } from "./actions";

const FIELD =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent-1";

export function ReportDialog({ onClose }: { onClose: () => void }) {
  const [nature, setNature] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  usePendingScreen(pending);

  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const next = [...files];
    for (const f of Array.from(picked)) {
      if (!REPORT_IMAGES_TYPES[f.type])
        return setError("Only PNG, JPEG, WebP and GIF images can be attached.");
      if (next.length > REPORT_MAX_FILES)
        return setError(`You can attach up to ${REPORT_MAX_FILES} images.`);
      next.push(f);
    }
    if (next.reduce((sum, f) => sum + f.size, 0) > REPORT_MAX_TOTAL_BYTES)
      return setError(
        `Attachments are too large (max ${REPORT_MAX_TOTAL_BYTES} MB in total).`,
      );
    setError("");
    setFiles(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (!nature) return setError("Choose the nature of the report.");
    if (!description.trim()) return setError("Describe the problem.");

    setPending(true);
    setError("");

    try {
      const fd = new FormData(e.currentTarget);
      files.forEach((f) => fd.append("attachments", f));
      const res = await submitReport(fd);
      if (res.ok) setSent(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again...");
    } finally {
      setPending(false);
    }
  }

  if (pending) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && !description && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full rounded-2xl bg-container p-6 shadow-xl ${
          sent ? "max-w-85" : "max-w-lg"
        }`}
      >
        {!sent && (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              aria-label="close"
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent-4 disabled:opacity-50"
            >
              <FiX size={22} />
            </button>

            <h2
              id="report-title"
              className="mb-4 text-center text-3xl font-bold"
            >
              Report Form
            </h2>
          </>
        )}

        {sent ? (
          <div className="py-2 text-center">
            <p id="report-title" className="text-2xl font-bold">
              Thank You!
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Your report has been sent.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg bg-accent-1 px-8 py-2 font-semibold text-white hover:opacity-90"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label htmlFor="report-nature" className="block text-lg font-bold">
              Nature of Report
            </label>
            <select
              name="nature"
              id="report-nature"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              className={`${FIELD} mt-1`}
            >
              <option value="" disabled>
                Select the type of problem
              </option>
              {REPORT_NATURES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>

            <label
              htmlFor="report-description"
              className="mt-2 block text-lg font-bold"
            >
              Bug Description
            </label>
            <textarea
              name="description"
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={REPORT_MAX_LENGTH}
              rows={5}
              placeholder="Enter bug description"
              className={`${FIELD} mt-1 block resize-none`}
            />
            <p className="text-right text-xs text-gray-500">
              {description.length}/{REPORT_MAX_LENGTH}
            </p>

            <p className="text-lg font-bold">
              Attachments{" "}
              <span className="text-base font-normal text-gray-500">
                (Optional)
              </span>
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div
                  key={src}
                  className="relative h-20 w-24 overflow-hidden rounded-lg border border-accent-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Attachment ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove Attachment ${i + 1}`}
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              {files.length < REPORT_MAX_FILES && (
                <label className="flex h-20 w-24 items-center justify-center rounded-lg border border-accent-1 bg-blue-50 text-accent-1 hover:bg-blue-100 hover:cursor-pointer">
                  <FiPlus size={24} />
                  <span className="sr-only">Add an image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-6">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="flex-1 rounded-lg bg-accent-2 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-accent-1 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
