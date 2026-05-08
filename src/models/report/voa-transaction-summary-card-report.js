const { sql, reportPoolConnect } = require("../../config/report-db");

const toNumber = (value) => Number(value || 0);
const formatDateLabel = (value) => {
  if (!value) {
    return "-";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
};

const CARD_CONFIG = {
  total_transactions: {
    title: "Total Transactions",
    helper: (latestDate) => `Latest date ${formatDateLabel(latestDate)}`,
    query: `
      SELECT COUNT(*) AS metric_value
      FROM v_rekon_voa_new
      WHERE transaction_date >= @latestSummaryDate
        AND transaction_date < DATEADD(DAY, 1, @latestSummaryDate)
    `,
  },
  matched_success: {
    title: "Matched Success",
    helper: () => "Transaksi normal pada latest transaction date",
    query: `
      SELECT SUM(CASE WHEN status_indikator = 'MATCHED' AND payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS metric_value
      FROM v_rekon_voa_new
      WHERE transaction_date >= @latestSummaryDate
        AND transaction_date < DATEADD(DAY, 1, @latestSummaryDate)
    `,
  },
  potential_refund: {
    title: "Potential Refund",
    helper: () => "Indikasi problem aktif pada latest transaction date",
    query: `
      SELECT SUM(CASE WHEN status_indikator = 'POTENTIAL REFUND' THEN 1 ELSE 0 END) AS metric_value
      FROM v_rekon_voa_new
      WHERE transaction_date >= @latestSummaryDate
        AND transaction_date < DATEADD(DAY, 1, @latestSummaryDate)
    `,
  },
  refunded: {
    title: "Refunded",
    helper: () => "Jumlah transaksi yang telah direfund pada latest transaction date",
    query: `
      SELECT SUM(CASE WHEN status_indikator = 'REFUNDED' THEN 1 ELSE 0 END) AS metric_value
      FROM v_rekon_voa_new
      WHERE transaction_date >= @latestSummaryDate
        AND transaction_date < DATEADD(DAY, 1, @latestSummaryDate)
    `,
  },
};

const getLatestSummaryDate = async (pool) => {
  const result = await pool.request().query(`
    SELECT TOP 1 transaction_date AS latest_summary_date
    FROM v_rekon_voa_new
    WHERE transaction_date IS NOT NULL
    ORDER BY transaction_date DESC
  `);

  return result.recordset[0]?.latest_summary_date || null;
};

const getVoaTransactionSummaryCardReport = async ({ metric }) => {
  const pool = await reportPoolConnect;
  const config = CARD_CONFIG[metric];

  if (!config) {
    throw new Error(`Unsupported VOA summary metric: ${metric}`);
  }

  const latestSummaryDate = await getLatestSummaryDate(pool);

  if (!latestSummaryDate) {
    return {
      key: metric,
      title: config.title,
      value: 0,
      helper: config.helper(null),
      latest_date: null,
    };
  }

  const request = pool.request();
  request.input("latestSummaryDate", sql.Date, latestSummaryDate);

  const result = await request.query(config.query);

  return {
    key: metric,
    title: config.title,
    value: toNumber(result.recordset[0]?.metric_value),
    helper: config.helper(latestSummaryDate),
    latest_date: latestSummaryDate,
  };
};

module.exports = getVoaTransactionSummaryCardReport;
