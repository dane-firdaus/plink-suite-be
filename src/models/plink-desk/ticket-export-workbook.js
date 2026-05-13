const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { resolveTemplateWorksheet } = require("./shared-template");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "templates",
  "CALLCANTER_LOG_v2_2026_template.xlsx"
);

const formatExcelDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date;
};

const mapStatusForExport = (status) => {
  if (["closed", "resolved"].includes(status)) {
    return "Closed";
  }

  return "Open";
};

const buildInvestigationProcess = (ticket) => {
  if (ticket.investigation_process) {
    return ticket.investigation_process;
  }

  if (ticket.handling_sop_title) {
    return `Buka SOP '${ticket.handling_sop_title}'`;
  }

  if (ticket.handling_sop_code) {
    return `Buka ${ticket.handling_sop_code}`;
  }

  return "";
};

const applyStoredRowStyle = (worksheet, targetRowNumber, totalColumns, templateStyle) => {
  for (let col = 1; col <= totalColumns; col += 1) {
    const targetCell = worksheet.getRow(targetRowNumber).getCell(col);
    const sourceCell = templateStyle.cells[col];
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style || {}));
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = sourceCell.alignment
      ? JSON.parse(JSON.stringify(sourceCell.alignment))
      : sourceCell.alignment;
    targetCell.border = sourceCell.border
      ? JSON.parse(JSON.stringify(sourceCell.border))
      : sourceCell.border;
    targetCell.fill = sourceCell.fill
      ? JSON.parse(JSON.stringify(sourceCell.fill))
      : sourceCell.fill;
    targetCell.font = sourceCell.font
      ? JSON.parse(JSON.stringify(sourceCell.font))
      : sourceCell.font;
  }

  worksheet.getRow(targetRowNumber).height = templateStyle.height;
};

const getTemplateColumnIndex = (targetColumn) => {
  if (targetColumn <= 11) {
    return targetColumn;
  }

  if (targetColumn <= 17) {
    return targetColumn + 1;
  }

  return 18;
};

const createTicketExportWorkbook = async (tickets) => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Excel template not found at ${TEMPLATE_PATH}`);
  }

  const sourceWorkbook = new ExcelJS.Workbook();
  await sourceWorkbook.xlsx.readFile(TEMPLATE_PATH);

  const templateWorksheet = resolveTemplateWorksheet(sourceWorkbook);

  if (!templateWorksheet) {
    throw new Error("Worksheet CALLCENTER LOGS / CALLCENTER LOG / CALLCANTER LOG not found in template");
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("CALLCENTER LOGS");
  const templateRowNumber = 2;
  const maxColumns = 18;
  const headerValues = [];
  const templateStyle = {
    height: templateWorksheet.getRow(templateRowNumber).height,
    headerHeight: templateWorksheet.getRow(1).height,
    cells: {},
    headerCells: {},
  };

  for (let col = 1; col <= maxColumns; col += 1) {
    const templateColumnIndex = getTemplateColumnIndex(col);
    const headerCell = templateWorksheet.getRow(1).getCell(templateColumnIndex);
    const cell = templateWorksheet.getRow(templateRowNumber).getCell(templateColumnIndex);
    const templateColumn = templateWorksheet.getColumn(templateColumnIndex);

    worksheet.getColumn(col).width = templateColumn.width;
    if (templateColumn.style) {
      worksheet.getColumn(col).style = JSON.parse(
        JSON.stringify(templateColumn.style)
      );
    }

    headerValues[col] = col === 18 ? "First Time Response" : headerCell.value;
    templateStyle.headerCells[col] = {
      style: headerCell.style,
      numFmt: headerCell.numFmt,
      alignment: headerCell.alignment,
      border: headerCell.border,
      fill: headerCell.fill,
      font: headerCell.font,
    };
    templateStyle.cells[col] = {
      style: cell.style,
      numFmt: cell.numFmt,
      alignment: cell.alignment,
      border: cell.border,
      fill: cell.fill,
      font: cell.font,
    };
  }

  if (templateWorksheet.views && templateWorksheet.views.length > 0) {
    worksheet.views = JSON.parse(JSON.stringify(templateWorksheet.views));
  }

  worksheet.getRow(1).values = headerValues;
  applyStoredRowStyle(worksheet, 1, maxColumns, {
    height: templateStyle.headerHeight,
    cells: templateStyle.headerCells,
  });

  if (tickets.length === 0) {
    worksheet.insertRow(2, new Array(maxColumns).fill(""));
    applyStoredRowStyle(worksheet, 2, maxColumns, templateStyle);
    for (let col = 1; col <= maxColumns; col += 1) {
      worksheet.getRow(2).getCell(col).value = col === 1 ? "No data" : "";
    }
  } else {
    tickets.forEach((ticket, index) => {
      const rowNumber = index + 2;
      worksheet.insertRow(rowNumber, new Array(maxColumns).fill(""));
      applyStoredRowStyle(worksheet, rowNumber, maxColumns, templateStyle);
      const row = worksheet.getRow(rowNumber);

      row.getCell(1).value = ticket.ticket_number;
      row.getCell(2).value = formatExcelDate(ticket.ticket_date || ticket.created_at);
      row.getCell(3).value = ticket.channel || "";
      row.getCell(4).value = ticket.sender || "";
      row.getCell(5).value = ticket.merchant_name || "";
      row.getCell(6).value = ticket.category_group || "";
      row.getCell(7).value = ticket.product || "";
      row.getCell(8).value = ticket.detail_0 || "";
      row.getCell(9).value = ticket.detail_1 || "";
      row.getCell(10).value = ticket.detail_2 || ticket.description || ticket.title || "";
      row.getCell(11).value = ticket.bank || "";
      row.getCell(12).value = mapStatusForExport(ticket.status);
      row.getCell(13).value = ticket.note_detail || "";
      row.getCell(14).value = ticket.handling_sop_code || "";
      row.getCell(15).value = buildInvestigationProcess(ticket);
      row.getCell(16).value = formatExcelDate(ticket.closed_at || ticket.resolved_at);
      row.getCell(17).value = formatExcelDate(ticket.updated_at || ticket.created_at);
      row.getCell(18).value = formatExcelDate(ticket.first_time_response);
      row.commit();
    });
  }

  worksheet.autoFilter = templateWorksheet.autoFilter;

  return workbook;
};

module.exports = createTicketExportWorkbook;
