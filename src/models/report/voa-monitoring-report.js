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

const normalizeDateKey = (value) => {
  const iso = new Date(value).toISOString();
  return iso.slice(0, 10);
};

const buildIssueSample = (row, issueType) => {
  if (issueType === "potential_refund") {
    return {
      payment_method: null,
      terminal: null,
      transaction_date: row.transaction_date,
      cutoffdate: null,
      ecomm_ref_no: row.ecomm_ref_no || null,
      bank_ref_no: null,
      card_type: null,
      card_no: null,
      amount: toNumber(row.amount),
      net_amount: toNumber(row.amount),
      merc_ref_no: row.merc_ref_no || null,
      billing_id: null,
      ntb: null,
      ntpn: null,
      payment_status: "PENDING",
      status_indikator: "POTENTIAL REFUND",
      issue_flags: ["Potential Refund"],
      source_view: "v_potential_refund_voa",
    };
  }

  const isRefunded = row.payment_status === "SUCCESS";

  return {
    payment_method: null,
    terminal: null,
    transaction_date: row.transaction_date,
    cutoffdate: row.cutoffdate || null,
    ecomm_ref_no: row.ecomm_ref_no || null,
    bank_ref_no: row.bank_ref_no || null,
    card_type: null,
    card_no: row.card_no || null,
    amount: toNumber(row.amount),
    net_amount: toNumber(row.net_amount),
    merc_ref_no: row.merc_ref_no || null,
    billing_id: null,
    ntb: null,
    ntpn: null,
    payment_status: row.payment_status || null,
    status_indikator: isRefunded ? "REFUNDED" : "FAILED",
    issue_flags: [isRefunded ? "Refunded" : "Failed Payment"],
    source_view: "v_refund_voa",
  };
};

const getVoaMonitoringReport = async ({
  startDate,
  endDate,
  detailLimit = DEFAULT_DETAIL_LIMIT,
}) => {
  const pool = await reportPoolConnect;

  const maxDateResult = await pool.request().query(`
    SELECT TOP 1 TRY_CONVERT(date, trxdate) AS max_transaction_date
    FROM v_lapharianvoa
    WHERE TRY_CONVERT(date, trxdate) IS NOT NULL
    ORDER BY TRY_CONVERT(date, trxdate) DESC
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
  const safeDetailLimit = Math.max(Number(detailLimit) || DEFAULT_DETAIL_LIMIT, 1);
  const detailSlice = Math.max(Math.ceil(safeDetailLimit / 2), 1);

  const dailyRequest = pool.request();
  dailyRequest.input("startDate", sql.Date, effectiveStartDate);
  dailyRequest.input("endDate", sql.Date, effectiveEndDate);

  const potentialRequest = pool.request();
  potentialRequest.input("startDate", sql.Date, effectiveStartDate);
  potentialRequest.input("endDate", sql.Date, effectiveEndDate);

  const refundRequest = pool.request();
  refundRequest.input("startDate", sql.Date, effectiveStartDate);
  refundRequest.input("endDate", sql.Date, effectiveEndDate);

  const potentialSampleRequest = pool.request();
  potentialSampleRequest.input("startDate", sql.Date, effectiveStartDate);
  potentialSampleRequest.input("endDate", sql.Date, effectiveEndDate);
  potentialSampleRequest.input("detailLimit", sql.Int, detailSlice);

  const refundSampleRequest = pool.request();
  refundSampleRequest.input("startDate", sql.Date, effectiveStartDate);
  refundSampleRequest.input("endDate", sql.Date, effectiveEndDate);
  refundSampleRequest.input("detailLimit", sql.Int, detailSlice);

  const [
    dailyResult,
    potentialResult,
    refundResult,
    potentialSampleResult,
    refundSampleResult,
  ] = await Promise.all([
    dailyRequest.query(`
      SELECT
        TRY_CONVERT(date, trxdate) AS trx_date,
        ISNULL(vol_ca, 0) AS vol_ca,
        ISNULL(vol_cc, 0) AS vol_cc
      FROM v_lapharianvoa
      WHERE TRY_CONVERT(date, trxdate) >= @startDate
        AND TRY_CONVERT(date, trxdate) <= @endDate
      ORDER BY TRY_CONVERT(date, trxdate) DESC
    `),
    potentialRequest.query(`
      SELECT
        TRY_CONVERT(date, transaction_date) AS trx_date,
        COUNT(*) AS total_rows
      FROM v_potential_refund_voa
      WHERE TRY_CONVERT(date, transaction_date) >= @startDate
        AND TRY_CONVERT(date, transaction_date) <= @endDate
      GROUP BY TRY_CONVERT(date, transaction_date)
    `),
    refundRequest.query(`
      SELECT
        CAST(transaction_date AS date) AS trx_date,
        payment_status,
        COUNT(*) AS total_rows
      FROM v_refund_voa
      WHERE transaction_date >= @startDate
        AND transaction_date < DATEADD(DAY, 1, @endDate)
      GROUP BY CAST(transaction_date AS date), payment_status
    `),
    potentialSampleRequest.query(`
      SELECT TOP (@detailLimit)
        transaction_date,
        ecomm_ref_no,
        merc_ref_no,
        amount
      FROM v_potential_refund_voa
      WHERE TRY_CONVERT(date, transaction_date) >= @startDate
        AND TRY_CONVERT(date, transaction_date) <= @endDate
      ORDER BY TRY_CONVERT(date, transaction_date) DESC, ecomm_ref_no DESC
    `),
    refundSampleRequest.query(`
      SELECT TOP (@detailLimit)
        transaction_date,
        cutoffdate,
        merc_ref_no,
        ecomm_ref_no,
        payment_status,
        bank_ref_no,
        card_no,
        amount,
        net_amount
      FROM v_refund_voa
      WHERE transaction_date >= @startDate
        AND transaction_date < DATEADD(DAY, 1, @endDate)
      ORDER BY transaction_date DESC, ecomm_ref_no DESC
    `),
  ]);

  const potentialByDate = new Map();
  for (const row of potentialResult.recordset || []) {
    potentialByDate.set(normalizeDateKey(row.trx_date), toNumber(row.total_rows));
  }

  const refundByDate = new Map();
  for (const row of refundResult.recordset || []) {
    const dateKey = normalizeDateKey(row.trx_date);
    const current = refundByDate.get(dateKey) || { failed_count: 0, refunded: 0 };

    if (row.payment_status === "SUCCESS") {
      current.refunded += toNumber(row.total_rows);
    } else {
      current.failed_count += toNumber(row.total_rows);
    }

    refundByDate.set(dateKey, current);
  }

  const dailySummary = (dailyResult.recordset || []).map((row) => {
    const dateKey = normalizeDateKey(row.trx_date);
    const totalRows = toNumber(row.vol_ca) + toNumber(row.vol_cc);
    const potentialRefund = potentialByDate.get(dateKey) || 0;
    const refundInfo = refundByDate.get(dateKey) || { failed_count: 0, refunded: 0 };
    const failedCount = refundInfo.failed_count;
    const refunded = refundInfo.refunded;
    const matchedSuccess = Math.max(totalRows - potentialRefund - failedCount, 0);
    const issueRatePct = Number(
      (((potentialRefund + failedCount) * 100) / Number(totalRows || 1)).toFixed(2)
    );

    return {
      trx_date: row.trx_date,
      trx_date_label: formatDateLabel(row.trx_date),
      total_rows: totalRows,
      matched_success: matchedSuccess,
      potential_refund: potentialRefund,
      refunded,
      failed_count: failedCount,
      missing_reference_on_success: 0,
      issue_rate_pct: issueRatePct,
      health_status: getHealthStatus({
        issueRatePct,
        potentialRefundCount: potentialRefund,
        failedCount,
        missingReferenceOnSuccess: 0,
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

  const issueSamples = [
    ...(potentialSampleResult.recordset || []).map((row) => buildIssueSample(row, "potential_refund")),
    ...(refundSampleResult.recordset || []).map((row) => buildIssueSample(row, "refund")),
  ]
    .sort((left, right) => new Date(right.transaction_date) - new Date(left.transaction_date))
    .slice(0, safeDetailLimit);

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
      source: "fast-monitoring-views",
    },
    daily_summary: dailySummary,
    issue_samples: issueSamples,
  };
};

module.exports = getVoaMonitoringReport;
