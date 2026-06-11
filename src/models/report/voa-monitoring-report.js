const { sql, reportPoolConnect } = require("../../config/report-db");

const DEFAULT_DATE_LIMIT = 14;
const DEFAULT_DETAIL_LIMIT = 25;
const CACHE_TTL_MS = 30 * 1000;

const aggregateCache = new Map();
const issueSamplesCache = new Map();
let maxDateCache = { value: null, expiresAt: 0 };

const toNumber = (value) => Number(value || 0);

const formatDateLabel = (dateValue) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));

const formatDateKey = (dateValue) => {
  const date = new Date(dateValue);
  return date.toISOString().slice(0, 10);
};

const getHealthStatus = ({ issueRatePct, potentialRefundCount, failedCount, missingReferenceOnSuccess }) => {
  if (
    Number(issueRatePct || 0) >= 5 ||
    Number(potentialRefundCount || 0) >= 200 ||
    Number(failedCount || 0) >= 20
  ) {
    return "critical";
  }

  if (
    Number(issueRatePct || 0) > 0 ||
    Number(potentialRefundCount || 0) > 0 ||
    Number(failedCount || 0) > 0 ||
    Number(missingReferenceOnSuccess || 0) > 0
  ) {
    return "warning";
  }

  return "healthy";
};

const getHealthLabel = (status) => {
  if (status === "critical") return "Critical";
  if (status === "warning") return "Warning";
  return "Healthy";
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

const buildCacheKey = ({ startDate, endDate, detailLimit = "" }) =>
  `${formatDateKey(startDate)}|${formatDateKey(endDate)}|${detailLimit}`;

const readCache = (cache, key) => {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const writeCache = (cache, key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const isPotentialRefundRow = (row) => row.status_indikator === "POTENTIAL REFUND";

const isRefundedRow = (row) => row.status_indikator === "REFUNDED";

const isFailedRow = (row) =>
  row.payment_status !== "SUCCESS" &&
  !isPotentialRefundRow(row) &&
  !isRefundedRow(row);

const buildIssueSample = (row, issueType) => {
  if (issueType === "potential_refund") {
    return {
      payment_method: row.payment_method || null,
      terminal: row.terminal || null,
      transaction_date: row.transaction_date,
      cutoffdate: row.cutoffdate || null,
      ecomm_ref_no: row.ecomm_ref_no || null,
      bank_ref_no: row.bank_ref_no || null,
      card_type: row.card_type || null,
      card_no: row.card_no || null,
      amount: toNumber(row.amount),
      net_amount: toNumber(row.net_amount),
      merc_ref_no: row.merc_ref_no || null,
      billing_id: row.billing_id || null,
      ntb: row.ntb || null,
      ntpn: row.ntpn || null,
      payment_status: row.payment_status || null,
      status_indikator: "POTENTIAL REFUND",
      issue_flags: ["Potential Refund"],
      source_view: "v_rekon_voa_new",
    };
  }

  const isRefunded = row.status_indikator === "REFUNDED";

  return {
    payment_method: row.payment_method || null,
    terminal: row.terminal || null,
    transaction_date: row.transaction_date,
    cutoffdate: row.cutoffdate || null,
    ecomm_ref_no: row.ecomm_ref_no || null,
    bank_ref_no: row.bank_ref_no || null,
    card_type: row.card_type || null,
    card_no: row.card_no || null,
    amount: toNumber(row.amount),
    net_amount: toNumber(row.net_amount),
    merc_ref_no: row.merc_ref_no || null,
    billing_id: row.billing_id || null,
    ntb: row.ntb || null,
    ntpn: row.ntpn || null,
    payment_status: row.payment_status || null,
    status_indikator: isRefunded ? "REFUNDED" : "FAILED",
    issue_flags: [isRefunded ? "Refunded" : "Failed Payment"],
    source_view: "v_rekon_voa_new",
  };
};

const getMaxTransactionDate = async (pool) => {
  const cachedValue =
    maxDateCache.expiresAt > Date.now() ? maxDateCache.value : null;

  if (cachedValue) {
    return cachedValue;
  }

  const result = await pool.request().query(`
    SELECT TOP 1 CAST(transaction_date AS date) AS max_transaction_date
    FROM v_rekon_voa_new
    WHERE transaction_date IS NOT NULL
    ORDER BY transaction_date DESC
  `);

  const value = result.recordset[0]?.max_transaction_date || null;
  maxDateCache = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return value;
};

const resolveWindow = async ({ startDate, endDate }) => {
  const pool = await reportPoolConnect;
  const maxTransactionDate = await getMaxTransactionDate(pool);

  if (!maxTransactionDate) {
    return null;
  }

  return {
    pool,
    effectiveStartDate: startDate || getDefaultStartDate(maxTransactionDate),
    effectiveEndDate: endDate || maxTransactionDate,
  };
};

const getAggregateRows = async ({ startDate, endDate }) => {
  const windowInfo = await resolveWindow({ startDate, endDate });

  if (!windowInfo) {
    return null;
  }

  const { pool, effectiveStartDate, effectiveEndDate } = windowInfo;
  const cacheKey = buildCacheKey({
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  });
  const cachedValue = readCache(aggregateCache, cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const request = pool.request();
  request.input("startDate", sql.Date, effectiveStartDate);
  request.input("endDate", sql.Date, effectiveEndDate);

  const result = await request.query(`
    SELECT
      CAST(transaction_date AS date) AS transaction_date,
      payment_status,
      status_indikator,
      COUNT_BIG(*) AS total_rows
    FROM v_rekon_voa_new
    WHERE transaction_date >= @startDate
      AND transaction_date < DATEADD(DAY, 1, @endDate)
    GROUP BY
      CAST(transaction_date AS date),
      payment_status,
      status_indikator
  `);

  const value = {
    effectiveStartDate,
    effectiveEndDate,
    rows: result.recordset || [],
  };

  writeCache(aggregateCache, cacheKey, value);
  return value;
};

const buildMonitoringBundle = ({ effectiveStartDate, effectiveEndDate, rows }) => {
  const dailyBuckets = new Map();

  for (const row of rows || []) {
    const dateKey = formatDateKey(row.transaction_date);
    const rowCount = toNumber(row.total_rows);
    const current =
      dailyBuckets.get(dateKey) || {
        trx_date: new Date(dateKey),
        total_rows: 0,
        matched_success: 0,
        potential_refund: 0,
        refunded: 0,
        failed_count: 0,
        missing_reference_on_success: 0,
      };

    current.total_rows += rowCount;

    if (isPotentialRefundRow(row)) {
      current.potential_refund += rowCount;
    } else if (isRefundedRow(row)) {
      current.refunded += rowCount;
    } else if (isFailedRow(row)) {
      current.failed_count += rowCount;
    } else if (row.payment_status === "SUCCESS") {
      current.matched_success += rowCount;
    }

    dailyBuckets.set(dateKey, current);
  }

  const dailySummary = Array.from(dailyBuckets.values())
    .sort((left, right) => new Date(right.trx_date) - new Date(left.trx_date))
    .map((row) => {
      const totalRows = toNumber(row.total_rows);
      const potentialRefund = toNumber(row.potential_refund);
      const failedCount = toNumber(row.failed_count);
      const refunded = toNumber(row.refunded);
      const matchedSuccess = toNumber(row.matched_success);
      const missingReferenceOnSuccess = toNumber(row.missing_reference_on_success);
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
        missing_reference_on_success: missingReferenceOnSuccess,
        issue_rate_pct: issueRatePct,
        health_status: getHealthStatus({
          issueRatePct,
          potentialRefundCount: potentialRefund,
          failedCount,
          missingReferenceOnSuccess,
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
      source: "v_rekon_voa_new",
    },
    daily_summary: dailySummary,
  };
};

const getMonitoringSummaryBundle = async ({ startDate, endDate }) => {
  const aggregate = await getAggregateRows({ startDate, endDate });

  if (!aggregate) {
    return {
      summary: null,
      daily_summary: [],
    };
  }

  return buildMonitoringBundle(aggregate);
};

const getVoaMonitoringIssueSamples = async ({
  startDate,
  endDate,
  detailLimit = DEFAULT_DETAIL_LIMIT,
}) => {
  const windowInfo = await resolveWindow({ startDate, endDate });

  if (!windowInfo) {
    return {
      summary: null,
      issue_samples: [],
    };
  }

  const { pool, effectiveStartDate, effectiveEndDate } = windowInfo;
  const safeDetailLimit = Math.max(Number(detailLimit) || DEFAULT_DETAIL_LIMIT, 1);
  const cacheKey = buildCacheKey({
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    detailLimit: safeDetailLimit,
  });
  const cachedValue = readCache(issueSamplesCache, cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const request = pool.request();
  request.input("startDate", sql.Date, effectiveStartDate);
  request.input("endDate", sql.Date, effectiveEndDate);
  request.input("detailLimit", sql.Int, safeDetailLimit);

  const result = await request.query(`
    SELECT TOP (@detailLimit)
      transaction_date,
      cutoffdate,
      payment_method,
      terminal,
      ecomm_ref_no,
      bank_ref_no,
      card_type,
      card_no,
      merc_ref_no,
      billing_id,
      ntb,
      ntpn,
      payment_status,
      status_indikator,
      amount,
      net_amount
    FROM v_rekon_voa_new
    WHERE transaction_date >= @startDate
      AND transaction_date < DATEADD(DAY, 1, @endDate)
      AND (
        status_indikator IN ('POTENTIAL REFUND', 'REFUNDED')
        OR (
          payment_status <> 'SUCCESS'
          AND status_indikator NOT IN ('POTENTIAL REFUND', 'REFUNDED')
        )
      )
    ORDER BY transaction_date DESC, ecomm_ref_no DESC
  `);

  const value = {
    summary: {
      period_start: effectiveStartDate,
      period_end: effectiveEndDate,
      source: "v_rekon_voa_new",
    },
    issue_samples: (result.recordset || []).map((row) =>
      buildIssueSample(
        row,
        isPotentialRefundRow(row) ? "potential_refund" : "refund"
      )
    ),
  };

  writeCache(issueSamplesCache, cacheKey, value);
  return value;
};

const buildMetricCard = ({ metric, summary }) => {
  const latestDay = summary?.latest_day || null;
  const windowTotals = summary?.window_totals || null;
  const latestDayLabel = latestDay ? formatDateLabel(latestDay.trx_date) : "-";
  const periodLabel = `Period ${formatDateLabel(summary?.period_start)} - ${formatDateLabel(summary?.period_end)}`;

  if (!summary || !windowTotals) {
    return {
      key: metric,
      title: "Unknown",
      value: "-",
      helper: "No monitored data",
      display_type: "text",
      status: "healthy",
    };
  }

  const cardMap = {
    period_health: {
      title: "Period Health",
      value: getHealthLabel(windowTotals.health_status),
      helper: latestDay ? `Latest date ${latestDayLabel}` : "No monitored data",
      display_type: "text",
      status: windowTotals.health_status,
    },
    period_issue_rate: {
      title: "Period Issue Rate",
      value: windowTotals.issue_rate_pct,
      helper: "Potential refund + failed dibanding total transaksi periode monitoring",
      display_type: "percent",
      status: "healthy",
    },
    potential_refund: {
      title: "Potential Refund",
      value: windowTotals.potential_refund,
      helper: "Total potential refund pada periode monitoring",
      display_type: "number",
      status: "healthy",
    },
    failed_transaction: {
      title: "Failed Transaction",
      value: windowTotals.failed_count,
      helper: "Total transaksi failed pada periode monitoring",
      display_type: "number",
      status: "healthy",
    },
    missing_ref_on_success: {
      title: "Missing Ref On Success",
      value: windowTotals.missing_reference_on_success,
      helper: "Transaksi sukses tapi reference belum lengkap pada periode monitoring",
      display_type: "number",
      status: "healthy",
    },
    refunded: {
      title: "Refunded",
      value: windowTotals.refunded,
      helper: "Transaksi yang sudah masuk status refunded pada periode monitoring",
      display_type: "number",
      status: "healthy",
    },
    window_total_trx: {
      title: "Window Total Trx",
      value: windowTotals.total_rows,
      helper: periodLabel,
      display_type: "number",
      status: "healthy",
    },
    window_issue_rate: {
      title: "Window Issue Rate",
      value: windowTotals.issue_rate_pct,
      helper: "Health agregat periode monitoring",
      display_type: "percent",
      status: "healthy",
    },
  };

  return {
    key: metric,
    ...(cardMap[metric] || {
      title: metric,
      value: "-",
      helper: "Unsupported metric",
      display_type: "text",
      status: "healthy",
    }),
  };
};

const getVoaMonitoringSummaryCard = async ({ metric, startDate, endDate }) => {
  const bundle = await getMonitoringSummaryBundle({ startDate, endDate });

  return buildMetricCard({
    metric,
    summary: bundle.summary,
  });
};

const getVoaMonitoringDailySummary = async ({ startDate, endDate }) => {
  const bundle = await getMonitoringSummaryBundle({ startDate, endDate });

  return {
    summary: bundle.summary,
    daily_summary: bundle.daily_summary,
  };
};

const getVoaMonitoringReport = async ({
  startDate,
  endDate,
  detailLimit = DEFAULT_DETAIL_LIMIT,
}) => {
  const bundle = await getMonitoringSummaryBundle({ startDate, endDate });
  const issueSamplesResult = await getVoaMonitoringIssueSamples({
    startDate,
    endDate,
    detailLimit,
  });

  return {
    summary: bundle.summary,
    daily_summary: bundle.daily_summary,
    issue_samples: issueSamplesResult.issue_samples,
  };
};

module.exports = getVoaMonitoringReport;
module.exports.getSummaryCard = getVoaMonitoringSummaryCard;
module.exports.getDailySummary = getVoaMonitoringDailySummary;
module.exports.getIssueSamples = getVoaMonitoringIssueSamples;
