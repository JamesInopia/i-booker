export const REPORT_MAX_LENGTH = 500;
export const REPORT_BUCKET = "report-attachments";
export const REPORT_MAX_FILES = 3;
export const REPORT_MAX_TOTAL_BYTES = 4 * 1024 * 1024;

export const REPORT_NATURES = [
  { value: "functionality", label: "Functionality Issue" },
  { value: "visual", label: "Visual/Aesthetic Issue" },
  { value: "performance", label: "Performance Issue" },
  { value: "security", label: "Srcurity Issue" },
  { value: "data_content", label: "Data/Content Issue" },
  { value: "crash_error", label: "Crash/Error Issue" },
  { value: "usability", label: "Usability/UX Issue" },
  { value: "other", label: "Other" },
] as const;

export const REPORT_IMAGES_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "images/webp": "webp",
  "images/gif": "gif",
};
