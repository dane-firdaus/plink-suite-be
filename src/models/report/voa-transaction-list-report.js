const { sql, reportPoolConnect } = require("../../config/report-db");

const DEFAULT_LIMIT = 50;
const DEFAULT_DATE_LIMIT = 14;

const getDefaultStartDate = (maxDateValue) => {
  const maxDate = new Date(maxDateValue);
  return new Date(
    Date.UTC(
      maxDate.getUTCFullYear(),
      maxDate.getUTCMonth(),
      maxDate.getUTCDate() - (DEFAULT_DATE_LIMIT - 1)
    )
  );
};

const toNumber = (value) => Number(value || 0);

const FILTER_COLUMN_MAP = {
  transaction_date: "CONVERT(varchar(10), transaction_date, 23)",
  cutoffdate: "CONVERT(varchar(10), cutoffdate, 23)",
  payment_method: "payment_method",
  terminal: "terminal",
  ecomm_ref_no: "ecomm_ref_no",
  bank_ref_no: "bank_ref_no",
  merc_ref_no: "merc_ref_no",
  billing_id: "billing_id",
  ntb: "ntb",
  ntpn: "ntpn",
  card_type: "card_type",
  card_no: "card_no",
  amount: "CAST(amount AS varchar(50))",
  net_amount: "CAST(net_amount AS varchar(50))",
  payment_status: "payment_status",
  status_indikator: "status_indikator",
};

const buildFilterClause = (filters = {}) => {
  return Object.entries(FILTER_COLUMN_MAP)
    .filter(([key]) => String(filters[key] || "").trim())
    .map(
      ([key, columnExpression]) =>
        `AND ${columnExpression} LIKE '%' + @filter_${key} + '%'`
    )
    .join("\n");
};

const attachFilterInputs = (request, filters = {}) => {
  Object.keys(FILTER_COLUMN_MAP).forEach((key) => {
    const value = String(filters[key] || "").trim();

    if (value) {
      request.input(`filter_${key}`, sql.VarChar(sql.MAX), value);
    }
  });
};

const getVoaTransactionListReport = async ({
  page = 1,
  limit = DEFAULT_LIMIT,
  startDate,
  endDate,
  filters = {},
}) => {
  const pool = await reportPoolConnect;
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || DEFAULT_LIMIT, 1);
  const offset = (safePage - 1) * safeLimit;
  const filterClause = buildFilterClause(filters);

  const maxDateResult = await pool.request().query(`
    SELECT TOP 1 transaction_date AS max_transaction_date
    FROM v_rekon_voa_new
    WHERE transaction_date IS NOT NULL
    ORDER BY transaction_date DESC
  `);

  const maxTransactionDate = maxDateResult.recordset[0]?.max_transaction_date;

  if (!maxTransactionDate) {
    return {
      summary: null,
      data: [],
      pagination: {
        totalData: 0,
        totalPage: 0,
        rowPerPage: safeLimit,
        currentPage: safePage,
      },
    };
  }

  const effectiveStartDate = startDate || getDefaultStartDate(maxTransactionDate);
  const effectiveEndDate = endDate || maxTransactionDate;
  const latestSummaryDate = endDate || maxTransactionDate;

  const listRequest = pool.request();
  listRequest.input("startDate", sql.Date, effectiveStartDate);
  listRequest.input("endDate", sql.Date, effectiveEndDate);
  listRequest.input("offset", sql.Int, offset);
  listRequest.input("fetchLimit", sql.Int, safeLimit + 1);
  attachFilterInputs(listRequest, filters);

  const listPromise = listRequest.query(`
    SELECT
      payment_method,
      terminal,
      transaction_date,
      cutoffdate,
      ecomm_ref_no,
      bank_ref_no,
      card_type,
      card_no,
      amount,
      net_amount,
      merc_ref_no,
      billing_id,
      ntb,
      ntpn,
      payment_status,
      status_indikator
    FROM v_rekon_voa_new
    WHERE transaction_date >= @startDate
      AND transaction_date < DATEADD(DAY, 1, @endDate)
      ${filterClause}
    ORDER BY transaction_date DESC, ecomm_ref_no DESC
    OFFSET @offset ROWS FETCH NEXT @fetchLimit ROWS ONLY
  `);

  const listResult = await listPromise;

  const rawRows = listResult.recordset || [];
  const hasMore = rawRows.length > safeLimit;
  const rows = rawRows.slice(0, safeLimit);
  const estimatedTotalData = hasMore ? offset + safeLimit + 1 : offset + rows.length;

  return {
    summary: null,
    data: rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
      net_amount: toNumber(row.net_amount),
    })),
    pagination: {
      totalData: estimatedTotalData,
      totalPage: Math.ceil(estimatedTotalData / safeLimit),
      rowPerPage: safeLimit,
      currentPage: safePage,
      hasMore,
      isEstimatedTotal: hasMore,
    },
  };
};

module.exports = getVoaTransactionListReport;
