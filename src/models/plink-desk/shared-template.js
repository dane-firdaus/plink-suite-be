const TEMPLATE_SHEET_CANDIDATES = ["CALLCENTER LOGS", "CALLCENTER LOG", "CALLCANTER LOG"];

const resolveTemplateWorksheet = (workbook) =>
  TEMPLATE_SHEET_CANDIDATES.map((name) => workbook.getWorksheet(name)).find(Boolean) || null;

const normalizeText = (value) => String(value || "").trim();

const normalizeStatusFromImport = (value) => {
  const normalized = normalizeText(value).toLowerCase();

  if (["closed", "resolved"].includes(normalized)) {
    return "closed";
  }

  if (normalized === "pending") {
    return "pending";
  }

  if (normalized === "in_progress") {
    return "in_progress";
  }

  return "open";
};

module.exports = {
  TEMPLATE_SHEET_CANDIDATES,
  resolveTemplateWorksheet,
  normalizeText,
  normalizeStatusFromImport,
};
