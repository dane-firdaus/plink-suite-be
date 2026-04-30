const ExcelJS = require("exceljs");
const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const {
  resolveTemplateWorksheet,
  normalizeStatusFromImport,
  normalizeText,
} = require("./shared-template");

const getCellText = (value) => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value?.richText)) {
    return value.richText.map((item) => item.text || "").join("").trim();
  }

  if (typeof value?.text === "string") {
    return value.text.trim();
  }

  if (typeof value?.result === "string" || typeof value?.result === "number") {
    return String(value.result).trim();
  }

  if (typeof value?.formula === "string" && value.result == null) {
    return value.formula.trim();
  }

  if (typeof value?.hyperlink === "string" && typeof value?.text === "string") {
    return value.text.trim();
  }

  return String(value).trim();
};

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value?.result) {
    return toDateOrNull(value.result);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildFingerprint = (ticket) =>
  [
    ticket.ticket_date ? ticket.ticket_date.toISOString().slice(0, 10) : "",
    normalizeText(ticket.sender).toLowerCase(),
    normalizeText(ticket.merchant_name).toLowerCase(),
    normalizeText(ticket.detail_0).toLowerCase(),
    normalizeText(ticket.detail_1).toLowerCase(),
    normalizeText(ticket.detail_category_code).toLowerCase(),
  ].join("|");

const buildImportedTicketNumber = (rowNumber, ticketDate) => {
  const datePart = (ticketDate || new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  return `IMP-${datePart}-${String(rowNumber).padStart(4, "0")}`;
};

const rowHasImportData = (row) => {
  for (let col = 1; col <= 18; col += 1) {
    if (normalizeText(row.getCell(col).value)) {
      return true;
    }
  }

  return false;
};

const mapRowToTicket = (row, rowNumber, createdBy) => {
  const ticketDate = toDateOrNull(row.getCell(2).value) || new Date();
  const closedDate = toDateOrNull(row.getCell(17).value);
  const ticketNumber = getCellText(row.getCell(1).value) || buildImportedTicketNumber(rowNumber, ticketDate);
  const detail0 = getCellText(row.getCell(8).value);
  const detail1 = getCellText(row.getCell(9).value);
  const detail2 = getCellText(row.getCell(10).value);
  const importedStatus = normalizeStatusFromImport(row.getCell(13).value);
  const finalStatus = closedDate ? "closed" : importedStatus;

  return {
    id: uuid(),
    ticket_number: ticketNumber,
    title: detail0 || detail2 || `Imported Ticket ${ticketNumber}`,
    description: detail2,
    customer_name: getCellText(row.getCell(4).value),
    merchant_id: "",
    merchant_name: getCellText(row.getCell(5).value),
    issue_category: "",
    priority: "medium",
    status: finalStatus,
    assigned_to: "",
    created_by: createdBy,
    created_at: ticketDate,
    updated_at: closedDate || ticketDate,
    resolved_at: finalStatus === "closed" ? closedDate || ticketDate : null,
    ticket_date: ticketDate,
    channel: getCellText(row.getCell(3).value),
    sender: getCellText(row.getCell(4).value),
    category_group: getCellText(row.getCell(6).value),
    product: getCellText(row.getCell(7).value),
    detail_0: detail0,
    detail_1: detail1,
    detail_2: detail2,
    bank: getCellText(row.getCell(11).value),
    detail_category_code: getCellText(row.getCell(12).value),
    note_detail: getCellText(row.getCell(14).value),
    handling_sop_code: getCellText(row.getCell(15).value),
    investigation_process: getCellText(row.getCell(16).value),
    closed_at: finalStatus === "closed" ? closedDate || ticketDate : null,
  };
};

const importTicketWorkbook = async ({ buffer, createdBy }) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = resolveTemplateWorksheet(workbook);

  if (!worksheet) {
    throw new Error("Worksheet CALLCENTER LOGS / CALLCENTER LOG / CALLCANTER LOG not found");
  }

  const client = await dbPool.connect();
  const seenTicketNumbers = new Set();
  const seenFingerprints = new Set();
  const summary = {
    inserted: 0,
    skipped_duplicates: 0,
    skipped_empty: 0,
    failed: 0,
    errors: [],
  };

  try {
    await client.query("BEGIN");

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      if (!rowHasImportData(row)) {
        summary.skipped_empty += 1;
        continue;
      }

      const mapped = mapRowToTicket(row, rowNumber, createdBy);
      const fingerprint = buildFingerprint(mapped);

      if (seenTicketNumbers.has(mapped.ticket_number) || seenFingerprints.has(fingerprint)) {
        summary.skipped_duplicates += 1;
        continue;
      }

      const existing = await client.query(
        `
          SELECT id
          FROM support_tickets
          WHERE ticket_number = $1
             OR (
               ticket_date::date = $2::date
               AND LOWER(TRIM(COALESCE(sender, ''))) = LOWER(TRIM($3))
               AND LOWER(TRIM(COALESCE(merchant_name, ''))) = LOWER(TRIM($4))
               AND LOWER(TRIM(COALESCE(detail_0, ''))) = LOWER(TRIM($5))
               AND LOWER(TRIM(COALESCE(detail_1, ''))) = LOWER(TRIM($6))
               AND LOWER(TRIM(COALESCE(detail_category_code, ''))) = LOWER(TRIM($7))
             )
          LIMIT 1
        `,
        [
          mapped.ticket_number,
          mapped.ticket_date,
          mapped.sender,
          mapped.merchant_name,
          mapped.detail_0,
          mapped.detail_1,
          mapped.detail_category_code,
        ]
      );

      if (existing.rows.length > 0) {
        summary.skipped_duplicates += 1;
        seenTicketNumbers.add(mapped.ticket_number);
        seenFingerprints.add(fingerprint);
        continue;
      }

      await client.query(
        `
          INSERT INTO support_tickets (
            id,
            ticket_number,
            title,
            description,
            customer_name,
            merchant_id,
            merchant_name,
            issue_category,
            priority,
            status,
            assigned_to,
            created_by,
            created_at,
            updated_at,
            resolved_at,
            ticket_date,
            channel,
            sender,
            category_group,
            product,
            detail_0,
            detail_1,
            detail_2,
            bank,
            detail_category_code,
            note_detail,
            handling_sop_code,
            investigation_process,
            closed_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `,
        [
          mapped.id,
          mapped.ticket_number,
          mapped.title,
          mapped.description,
          mapped.customer_name,
          mapped.merchant_id,
          mapped.merchant_name,
          mapped.issue_category,
          mapped.priority,
          mapped.status,
          mapped.assigned_to,
          mapped.created_by,
          mapped.created_at,
          mapped.updated_at,
          mapped.resolved_at,
          mapped.ticket_date,
          mapped.channel,
          mapped.sender,
          mapped.category_group,
          mapped.product,
          mapped.detail_0,
          mapped.detail_1,
          mapped.detail_2,
          mapped.bank,
          mapped.detail_category_code,
          mapped.note_detail,
          mapped.handling_sop_code,
          mapped.investigation_process,
          mapped.closed_at,
        ]
      );

      await client.query(
        `
          INSERT INTO support_ticket_activities (
            id,
            ticket_id,
            activity_type,
            old_status,
            new_status,
            notes,
            created_by,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          uuid(),
          mapped.id,
          "imported",
          null,
          mapped.status,
          `Ticket imported from worksheet row ${rowNumber}`,
          createdBy,
          new Date(),
        ]
      );

      seenTicketNumbers.add(mapped.ticket_number);
      seenFingerprints.add(fingerprint);
      summary.inserted += 1;
    }

    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    summary.failed += 1;
    summary.errors.push(error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = importTicketWorkbook;
