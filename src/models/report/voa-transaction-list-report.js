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

  const maxDateRequest = pool.request();
  maxDateRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);

  const maxDateResult = await maxDateRequest.query(`
    SELECT MAX(CAST(transaction_date AS date)) AS max_transaction_date
    FROM v_rekon_voa_new
    WHERE transaction_date IS NOT NULL
      AND (
        @search = ''
        OR ecomm_ref_no LIKE '%' + @search + '%'
        OR bank_ref_no LIKE '%' + @search + '%'
        OR merc_ref_no LIKE '%' + @search + '%'
        OR billing_id LIKE '%' + @search + '%'
        OR ntb LIKE '%' + @search + '%'
        OR ntpn LIKE '%' + @search + '%'
        OR payment_status LIKE '%' + @search + '%'
        OR status_indikator LIKE '%' + @search + '%'
      )
  `);

  const maxTransactionDate = maxDateResult.recordset[0]?.max_transaction_date;

  if (!maxTransactionDate) {
    return {
      summary: {
        total_rows: 0,
        total_amount: 0,
        total_net_amount: 0,
        matched_success: 0,
        potential_refund: 0,
        refunded: 0,
        failed_count: 0,
      },
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

  const summaryRequest = pool.request();
  summaryRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  summaryRequest.input("latestSummaryDate", sql.Date, latestSummaryDate);

  const summaryResult = await summaryRequest.query(`
    SELECT
      COUNT(*) AS total_rows,
      SUM(CAST(amount AS decimal(18,2))) AS total_amount,
      SUM(CAST(net_amount AS decimal(18,2))) AS total_net_amount,
      SUM(CASE WHEN status_indikator = 'MATCHED' AND payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS matched_success,
      SUM(CASE WHEN status_indikator = 'POTENTIAL REFUND' THEN 1 ELSE 0 END) AS potential_refund,
      SUM(CASE WHEN status_indikator = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded,
      SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count
    FROM v_rekon_voa_new
    WHERE CAST(transaction_date AS date) = @latestSummaryDate
      AND (
        @search = ''
        OR ecomm_ref_no LIKE '%' + @search + '%'
        OR bank_ref_no LIKE '%' + @search + '%'
        OR merc_ref_no LIKE '%' + @search + '%'
        OR billing_id LIKE '%' + @search + '%'
        OR ntb LIKE '%' + @search + '%'
        OR ntpn LIKE '%' + @search + '%'
        OR payment_status LIKE '%' + @search + '%'
        OR status_indikator LIKE '%' + @search + '%'
      )
  `);

  const countRequest = pool.request();
  countRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  countRequest.input("startDate", sql.Date, effectiveStartDate);
  countRequest.input("endDate", sql.Date, effectiveEndDate);

  const countResult = await countRequest.query(`
    SELECT COUNT(*) AS total_rows
    FROM v_rekon_voa_new
    WHERE CAST(transaction_date AS date) >= @startDate
      AND CAST(transaction_date AS date) <= @endDate
      AND (
        @search = ''
        OR ecomm_ref_no LIKE '%' + @search + '%'
        OR bank_ref_no LIKE '%' + @search + '%'
        OR merc_ref_no LIKE '%' + @search + '%'
        OR billing_id LIKE '%' + @search + '%'
        OR ntb LIKE '%' + @search + '%'
        OR ntpn LIKE '%' + @search + '%'
        OR payment_status LIKE '%' + @search + '%'
        OR status_indikator LIKE '%' + @search + '%'
      )
  `);

  const listRequest = pool.request();
  listRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  listRequest.input("startDate", sql.Date, effectiveStartDate);
  listRequest.input("endDate", sql.Date, effectiveEndDate);
  listRequest.input("offset", sql.Int, offset);
  listRequest.input("limit", sql.Int, safeLimit);

  const listResult = await listRequest.query(`
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
      WHERE CAST(transaction_date AS date) >= @startDate
        AND CAST(transaction_date AS date) <= @endDate
        AND (
          @search = ''
          OR ecomm_ref_no LIKE '%' + @search + '%'
          OR bank_ref_no LIKE '%' + @search + '%'
          OR merc_ref_no LIKE '%' + @search + '%'
          OR billing_id LIKE '%' + @search + '%'
          OR ntb LIKE '%' + @search + '%'
          OR ntpn LIKE '%' + @search + '%'
          OR payment_status LIKE '%' + @search + '%'
          OR status_indikator LIKE '%' + @search + '%'
        )
    ) AS numbered
    WHERE row_num > @offset
      AND row_num <= (@offset + @limit)
    ORDER BY row_num ASC
  `);

  const summary = summaryResult.recordset[0] || {};
  const totalRows = Number(countResult.recordset[0]?.total_rows || 0);

  return {
    summary: {
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
    },
    data: (listResult.recordset || []).map((row) => ({
      ...row,
      amount: toNumber(row.amount),
      net_amount: toNumber(row.net_amount),
    })),
    pagination: {
      totalData: totalRows,
      totalPage: Math.ceil(totalRows / safeLimit),
      rowPerPage: safeLimit,
      currentPage: safePage,
    },
  };
};

module.exports = getVoaTransactionListReport;
