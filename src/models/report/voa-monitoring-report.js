const { sql, reportPoolConnect } = require("../../config/report-db");

const DEFAULT_DATE_LIMIT = 14;
const DEFAULT_DETAIL_LIMIT = 100;

const formatDateLabel = (dateValue) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));

const toNumber = (value) => Number(value || 0);

const getHealthStatus = ({ issueRatePct, potentialRefundCount, failedCount, missingReferenceOnSuccess }) => {
  if (
    Number(issueRatePct || 0) >= 5 ||
    Number(potentialRefundCount || 0) >= 200 ||
    Number(failedCount || 0) >= 20
  ) {
    return "critical";
  }

  if (
    Number(issueRatePct || 0) >= 2 ||
    Number(potentialRefundCount || 0) >= 50 ||
    Number(failedCount || 0) >= 5 ||
    Number(missingReferenceOnSuccess || 0) > 0
  ) {
    return "warning";
  }

  return "healthy";
};

const getIssueFlags = (row) => {
  const flags = [];

  if (row.status_indikator === "POTENTIAL REFUND") {
    flags.push("Potential Refund");
  }

  if (row.payment_status === "FAILED") {
    flags.push("Failed Payment");
  }

  if (!row.billing_id) {
    flags.push("Missing Billing ID");
  }

  if (!row.ntb) {
    flags.push("Missing NTB");
  }

  if (!row.ntpn) {
    flags.push("Missing NTPN");
  }

  return flags;
};

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

const getVoaMonitoringReport = async ({
  startDate,
  endDate,
  detailLimit = DEFAULT_DETAIL_LIMIT,
}) => {
  const pool = await reportPoolConnect;

  const maxDateResult = await pool.request().query(`
    SELECT MAX(CAST(transaction_date AS date)) AS max_transaction_date
    FROM v_rekon_voa_new
    WHERE transaction_date IS NOT NULL
  `);

  const maxTransactionDate = maxDateResult.recordset[0]?.max_transaction_date;

  if (!maxTransactionDate) {
    return {
      summary: null,
      daily_summary: [],
      issue_samples: [],
    };
  }

  const effectiveStartDate = startDate || getDefaultStartDate(maxTransactionDate);
  const effectiveEndDate = endDate || maxTransactionDate;

  const dailyRequest = pool.request();
  dailyRequest.input("startDate", sql.Date, effectiveStartDate);
  dailyRequest.input("endDate", sql.Date, effectiveEndDate);

  const dailyResult = await dailyRequest.query(`
    SELECT
      CAST(transaction_date AS date) AS trx_date,
      COUNT(*) AS total_rows,
      SUM(CASE WHEN status_indikator = 'MATCHED' AND payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS matched_success,
      SUM(CASE WHEN status_indikator = 'POTENTIAL REFUND' THEN 1 ELSE 0 END) AS potential_refund,
      SUM(CASE WHEN status_indikator = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded,
      SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count,
      SUM(
        CASE
          WHEN status_indikator = 'MATCHED'
            AND payment_status = 'SUCCESS'
            AND (
              billing_id IS NULL OR LTRIM(RTRIM(billing_id)) = ''
              OR ntb IS NULL OR LTRIM(RTRIM(ntb)) = ''
              OR ntpn IS NULL OR LTRIM(RTRIM(ntpn)) = ''
            )
          THEN 1
          ELSE 0
        END
      ) AS missing_reference_on_success
    FROM v_rekon_voa_new
    WHERE CAST(transaction_date AS date) >= @startDate
      AND CAST(transaction_date AS date) <= @endDate
    GROUP BY CAST(transaction_date AS date)
    ORDER BY trx_date DESC
  `);

  const dailySummary = (dailyResult.recordset || []).map((row) => {
    const issueRatePct = Number(
      ((Number(row.potential_refund || 0) + Number(row.failed_count || 0)) * 100) /
        Number(row.total_rows || 1)
    ).toFixed(2);

    return {
      trx_date: row.trx_date,
      trx_date_label: formatDateLabel(row.trx_date),
      total_rows: toNumber(row.total_rows),
      matched_success: toNumber(row.matched_success),
      potential_refund: toNumber(row.potential_refund),
      refunded: toNumber(row.refunded),
      failed_count: toNumber(row.failed_count),
      missing_reference_on_success: toNumber(row.missing_reference_on_success),
      issue_rate_pct: Number(issueRatePct),
      health_status: getHealthStatus({
        issueRatePct,
        potentialRefundCount: row.potential_refund,
        failedCount: row.failed_count,
        missingReferenceOnSuccess: row.missing_reference_on_success,
      }),
    };
  });

  const latestDay = dailySummary[0] || null;
  const windowTotals = dailySummary.reduce(
    (accumulator, item) => {
      accumulator.total_rows += item.total_rows;
      accumulator.matched_success += item.matched_success;
      accumulator.potential_refund += item.potential_refund;
      accumulator.refunded += item.refunded;
      accumulator.failed_count += item.failed_count;
      accumulator.missing_reference_on_success += item.missing_reference_on_success;
      return accumulator;
    },
    {
      total_rows: 0,
      matched_success: 0,
      potential_refund: 0,
      refunded: 0,
      failed_count: 0,
      missing_reference_on_success: 0,
    }
  );

  const windowIssueRatePct = Number(
    (
      ((windowTotals.potential_refund + windowTotals.failed_count) * 100) /
      Number(windowTotals.total_rows || 1)
    ).toFixed(2)
  );

  const detailRequest = pool.request();
  detailRequest.input("startDate", sql.Date, effectiveStartDate);
  detailRequest.input("endDate", sql.Date, effectiveEndDate);
  detailRequest.input("detailLimit", sql.Int, Number(detailLimit) || DEFAULT_DETAIL_LIMIT);

  const detailResult = await detailRequest.query(`
    SELECT TOP (@detailLimit)
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
    WHERE CAST(transaction_date AS date) >= @startDate
      AND CAST(transaction_date AS date) <= @endDate
      AND (
        status_indikator = 'POTENTIAL REFUND'
        OR payment_status = 'FAILED'
        OR (
          status_indikator = 'MATCHED'
          AND payment_status = 'SUCCESS'
          AND (
            billing_id IS NULL OR LTRIM(RTRIM(billing_id)) = ''
            OR ntb IS NULL OR LTRIM(RTRIM(ntb)) = ''
            OR ntpn IS NULL OR LTRIM(RTRIM(ntpn)) = ''
          )
        )
      )
    ORDER BY transaction_date DESC, ecomm_ref_no DESC
  `);

  const issueSamples = (detailResult.recordset || []).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
    net_amount: toNumber(row.net_amount),
    issue_flags: getIssueFlags(row),
  }));

  return {
    summary: {
      period_start: effectiveStartDate,
      period_end: effectiveEndDate,
      latest_day: latestDay,
      window_totals: {
        ...windowTotals,
        issue_rate_pct: windowIssueRatePct,
        health_status: getHealthStatus({
          issueRatePct: windowIssueRatePct,
          potentialRefundCount: windowTotals.potential_refund,
          failedCount: windowTotals.failed_count,
          missingReferenceOnSuccess: windowTotals.missing_reference_on_success,
        }),
      },
    },
    daily_summary: dailySummary,
    issue_samples: issueSamples,
  };
};

module.exports = getVoaMonitoringReport;
