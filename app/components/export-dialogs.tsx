"use client";

import { useState, type ReactNode } from "react";

const exportUrl = (ids: number[], extra = "") =>
  `/api/requests/export?ids=${ids.join(",")}${extra}`;

export function printRequests(ids: number[]) {
  window.open(exportUrl(ids, "&inline=1"), "_blank");
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Option({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 ${disabled ? "opacity-50" : ""} ${checked ? "border-blue-600" : "border-gray-300"}`}
    >
      <input
        type="radio"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

const btnOutline =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700";

export function DownloadDialog({
  ids,
  onClose,
}: {
  ids: number[];
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [mode, setMode] = useState<"combined" | "separate">("combined");
  const many = ids.length > 1;
  const ext = format.toUpperCase();

  function download() {
    window.location.assign(
      exportUrl(ids, `&format=${format}${many ? `&mode=${mode}` : ""}`),
    );
    onClose();
  }

  return (
    <Modal
      title={`Download ${many ? `${ids.length} requests` : "request"}`}
      onClose={onClose}
    >
      <p className="mb-2 text-sm font-medium">Format</p>
      <div className="flex flex-col gap-2">
        <Option
          checked={format === "pdf"}
          onChange={() => setFormat("pdf")}
          label="PDF"
        />
        <Option
          checked={format === "docx"}
          onChange={() => setFormat("docx")}
          label="DOCX"
          hint="Word Document"
        />
      </div>

      {many && (
        <>
          <p className="mb-2 mt-4 text-sm font-medium">Files</p>
          <div className="flex flex-col gap-2">
            <Option
              checked={mode === "combined"}
              onChange={() => setMode("combined")}
              label={`One ${ext}`}
              hint="All requests in a single file"
            />
            <Option
              checked={mode === "separate"}
              onChange={() => setMode("separate")}
              label="Separate files"
              hint={`One ${ext} per request, in a .zip`}
            />
          </div>
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className={btnOutline} onClick={onClose}>
          Cancel
        </button>
        <button className={btnPrimary} onClick={download}>
          Download
        </button>
      </div>
    </Modal>
  );
}
