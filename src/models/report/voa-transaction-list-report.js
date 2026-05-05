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

const buildSearchClause = (search) => {
  if (!search) {
    return "";
  }

  return `
    AND (
      ecomm_ref_no LIKE '%' + @search + '%'
      OR bank_ref_no LIKE '%' + @search + '%'
      OR merc_ref_no LIKE '%' + @search + '%'
      OR billing_id LIKE '%' + @search + '%'
      OR ntb LIKE '%' + @search + '%'
      OR ntpn LIKE '%' + @search + '%'
      OR payment_status LIKE '%' + @search + '%'
      OR status_indikator LIKE '%' + @search + '%'
    )
  `;
};

const getVoaTransactionListReport = async ({
  page = 1,
  limit = DEFAULT_LIMIT,
  startDate,
  endDate,
  search = "",
}) => {
  const pool = await reportPoolConnect;
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || DEFAULT_LIMIT, 1);
  const offset = (safePage - 1) * safeLimit;
  const trimmedSearch = String(search || "").trim();

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
  const searchClause = buildSearchClause(trimmedSearch);

  if (trimmedSearch) {
    const searchRequest = pool.request();
    searchRequest.input("startDate", sql.Date, effectiveStartDate);
    searchRequest.input("endDate", sql.Date, effectiveEndDate);
    searchRequest.input("offset", sql.Int, offset);
    searchRequest.input("fetchLimit", sql.Int, safeLimit + 1);
    searchRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);

    const searchResult = await searchRequest.query(`
      SELECT *
      FROM (
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
          status_indikator,
          ROW_NUMBER() OVER (ORDER BY transaction_date DESC, ecomm_ref_no DESC) AS row_num
        FROM v_rekon_voa_new
        WHERE transaction_date >= @startDate
          AND transaction_date < DATEADD(DAY, 1, @endDate)
          ${searchClause}
      ) AS numbered
      WHERE row_num > @offset
        AND row_num <= (@offset + @fetchLimit)
      ORDER BY row_num ASC
    `);

    const rawRows = searchResult.recordset || [];
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
  }

  const listRequest = pool.request();
  listRequest.input("startDate", sql.Date, effectiveStartDate);
  listRequest.input("endDate", sql.Date, effectiveEndDate);
  listRequest.input("offset", sql.Int, offset);
  listRequest.input("fetchLimit", sql.Int, safeLimit + 1);

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
    ORDER BY transaction_date DESC, ecomm_ref_no DESC
    OFFSET @offset ROWS FETCH NEXT @fetchLimit ROWS ONLY
  `);

  const summaryRequest = pool.request();
  summaryRequest.input("latestSummaryDate", sql.Date, latestSummaryDate);

  const summaryPromise = summaryRequest.query(`
      SELECT
        COUNT(*) AS total_rows,
        SUM(CAST(amount AS decimal(18,2))) AS total_amount,
        SUM(CAST(net_amount AS decimal(18,2))) AS total_net_amount,
        SUM(CASE WHEN status_indikator = 'MATCHED' AND payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS matched_success,
        SUM(CASE WHEN status_indikator = 'POTENTIAL REFUND' THEN 1 ELSE 0 END) AS potential_refund,
        SUM(CASE WHEN status_indikator = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded,
        SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count
      FROM v_rekon_voa_new
      WHERE transaction_date >= @latestSummaryDate
        AND transaction_date < DATEADD(DAY, 1, @latestSummaryDate)
    `);

  const [summaryResult, listResult] = await Promise.all([summaryPromise, listPromise]);

  const rawRows = listResult.recordset || [];
  const hasMore = rawRows.length > safeLimit;
  const rows = rawRows.slice(0, safeLimit);
  const summary = summaryResult.recordset[0] || null;
  const estimatedTotalData = hasMore ? offset + safeLimit + 1 : offset + rows.length;

  return {
    summary: summary
      ? {
          total_rows: toNumber(summary.total_rows),
          total_amount: toNumber(summary.total_amount),
          total_net_amount: toNumber(summary.total_net_amount),
          matched_success: toNumber(summary.matched_success),
          potential_refund: toNumber(summary.potential_refund),
          refunded: toNumber(summary.refunded),
          failed_count: toNumber(summary.failed_count),
          latest_date: latestSummaryDate,
          period_start: effectiveStartDate,
          period_end: effectiveEndDate,
        }
      : null,
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
