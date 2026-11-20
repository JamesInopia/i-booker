export const REPORT_MAX_LENGTH = 500;
export const REPORT_BUCKET = "report-attachments";
export const REPORT_MAX_FILES = 3;
export const REPORT_MAX_TOTAL_BYTES = 4 * 1024 * 1024;

export const REPORT_NATURES = [
  { value: "functionality", label: "Functionality Issue" },
  { value: "visual", label: "Visual/Aesthetic Issue" },
  { value: "performance", label: "Performance Issue" },
  { value: "security", label: "Security Issue" },
  { value: "data_content", label: "Data/Content Issue" },
  { value: "crash_error", label: "Crash/Error Issue" },
  { value: "usability", label: "Usability/UX Issue" },
  { value: "other", label: "Other" },
] as const;

export const REPORT_PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number]["value"];

export const REPORT_IMAGES_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
