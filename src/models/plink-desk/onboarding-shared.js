const crypto = require("crypto");
const ExcelJS = require("exceljs");
const { google } = require("googleapis");

const TEMPLATE_HEADER_ROWS = 2;
const TEMPLATE_DATA_START_ROW = 3;

const parseSpreadsheetId = (value = "") => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const match = rawValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : rawValue;
};

const getOnboardingSheetConfig = () => ({
  spreadsheetId: parseSpreadsheetId(process.env.PLINK_DESK_ONBOARDING_SHEET_URL),
  sheetName: String(process.env.PLINK_DESK_ONBOARDING_SHEET_NAME || "").trim(),
  keyColumn: String(process.env.PLINK_DESK_ONBOARDING_SYNC_KEY_COLUMN || "").trim(),
});

const isOnboardingSyncConfigured = () => {
  const config = getOnboardingSheetConfig();
  return Boolean(config.spreadsheetId);
};

const getGoogleServiceAccountCredentials = () => {
  const rawJson = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const privateKey = String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .trim();

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Sheets credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  };
};

const getGoogleAuth = async (scopes) => {
  const credentials = getGoogleServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes,
  });

  return auth.getClient();
};

const getSheetsClient = async () =>
  google.sheets({
    version: "v4",
    auth: await getGoogleAuth(["https://www.googleapis.com/auth/spreadsheets"]),
  });

const getDriveClient = async () =>
  google.drive({
    version: "v3",
    auth: await getGoogleAuth(["https://www.googleapis.com/auth/drive.readonly"]),
  });

const sanitizeCellValue = (value) => String(value ?? "").trim();

const extractCellValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return extractCellValue(value.result);
    }

    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return extractCellValue(value.text);
    }

    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("");
    }

    if (Object.prototype.hasOwnProperty.call(value, "hyperlink")) {
      return extractCellValue(value.text || value.hyperlink);
    }
  }

  return sanitizeCellValue(value);
};

const isEmptyRow = (row = []) => row.every((cell) => !sanitizeCellValue(cell));

const buildFingerprint = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex");

const buildSearchText = (data = {}) =>
  Object.values(data)
    .map((value) => sanitizeCellValue(value).toLowerCase())
    .filter(Boolean)
    .join(" ");

const columnNumberToName = (columnNumber) => {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

const buildCompositeHeader = (primaryHeader, secondaryHeader) => {
  const top = sanitizeCellValue(primaryHeader);
  const sub = sanitizeCellValue(secondaryHeader);

  if (top && sub) {
    return `${top} / ${sub}`;
  }

  return top || sub;
};

const fetchPublicWorkbookBuffer = async (spreadsheetId) => {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch public onboarding workbook: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const fetchDriveWorkbookBuffer = async (spreadsheetId) => {
  const drive = await getDriveClient();
  const response = await drive.files.export(
    {
      fileId: spreadsheetId,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data);
};

const getWorkbookBuffer = async () => {
  const config = getOnboardingSheetConfig();

  if (!config.spreadsheetId) {
    throw new Error("PLINK_DESK_ONBOARDING_SHEET_URL is not configured.");
  }

  try {
    return await fetchDriveWorkbookBuffer(config.spreadsheetId);
  } catch (error) {
    return fetchPublicWorkbookBuffer(config.spreadsheetId);
  }
};

const resolveWorksheet = (workbook, preferredName) =>
  workbook.getWorksheet(preferredName) || workbook.worksheets[0];

const buildColumnDefinitions = (worksheet) => {
  const primaryHeaderRow = worksheet.getRow(1);
  const secondaryHeaderRow = worksheet.getRow(2);
  const columns = [];

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const header = buildCompositeHeader(
      extractCellValue(primaryHeaderRow.getCell(columnIndex).value),
      extractCellValue(secondaryHeaderRow.getCell(columnIndex).value)
    );

    if (!header) {
      continue;
    }

    columns.push({
      columnIndex,
      header,
    });
  }

  return columns;
};

const buildRowObject = (columns, row) =>
  columns.reduce((accumulator, column) => {
    accumulator[column.header] = extractCellValue(row.getCell(column.columnIndex).value);
    return accumulator;
  }, {});

const loadOnboardingWorkbook = async () => {
  const config = getOnboardingSheetConfig();
  const buffer = await getWorkbookBuffer();
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = resolveWorksheet(workbook, config.sheetName);

  if (!worksheet) {
    throw new Error("Unable to resolve onboarding worksheet.");
  }

  return {
    workbook,
    buffer,
    worksheet,
    sheetName: worksheet.name,
    keyColumn: config.keyColumn,
  };
};

const readOnboardingSheet = async () => {
  const { workbook, buffer, worksheet, sheetName, keyColumn } =
    await loadOnboardingWorkbook();
  const columns = buildColumnDefinitions(worksheet);
  const headers = columns.map((column) => column.header);
  const rows = [];

  for (let rowNumber = TEMPLATE_DATA_START_ROW; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rowData = buildRowObject(columns, row);

    if (isEmptyRow(Object.values(rowData))) {
      continue;
    }

    rows.push({
      rowNumber,
      data: rowData,
    });
  }

  return {
    workbook,
    buffer,
    sheetName,
    keyColumn,
    headers,
    columns,
    rows,
    headerRows: [
      worksheet.getRow(1).values,
      worksheet.getRow(2).values,
    ],
  };
};

const buildSheetRowValues = (columns = [], data = {}) => {
  const maxColumnIndex = columns.reduce(
    (highest, column) => Math.max(highest, column.columnIndex),
    0
  );
  const values = new Array(maxColumnIndex).fill("");

  columns.forEach((column) => {
    values[column.columnIndex - 1] = sanitizeCellValue(data?.[column.header]);
  });

  return values;
};

const appendOnboardingSheetRow = async ({ columns, data }) => {
  const { spreadsheetId } = getOnboardingSheetConfig();
  const { sheetName } = await loadOnboardingWorkbook();
  const sheets = await getSheetsClient();
  const maxColumnIndex = columns.reduce(
    (highest, column) => Math.max(highest, column.columnIndex),
    0
  );
  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:${columnNumberToName(maxColumnIndex)}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [buildSheetRowValues(columns, data)],
    },
  });

  const updatedRange = appendResponse.data.updates?.updatedRange || "";
  const rowMatch = updatedRange.match(/![A-Z]+(\d+):/);

  return rowMatch ? Number(rowMatch[1]) : null;
};

const updateOnboardingSheetRow = async ({ rowNumber, columns, data }) => {
  const { spreadsheetId } = getOnboardingSheetConfig();
  const { sheetName } = await loadOnboardingWorkbook();
  const sheets = await getSheetsClient();
  const maxColumnIndex = columns.reduce(
    (highest, column) => Math.max(highest, column.columnIndex),
    0
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}:${columnNumberToName(maxColumnIndex)}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [buildSheetRowValues(columns, data)],
    },
  });

  return rowNumber;
};

module.exports = {
  TEMPLATE_DATA_START_ROW,
  TEMPLATE_HEADER_ROWS,
  appendOnboardingSheetRow,
  buildFingerprint,
  buildSearchText,
  buildSheetRowValues,
  columnNumberToName,
  getOnboardingSheetConfig,
  isOnboardingSyncConfigured,
  loadOnboardingWorkbook,
  readOnboardingSheet,
  sanitizeCellValue,
  updateOnboardingSheetRow,
};
