const { reportPoolConnect } = require("../../config/report-db");

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

const createEmptyCards = () => ({
  total_transactions: { title: "Total Transactions", value: 0, helper: "Latest date -" },
  matched_success: { title: "Matched Success", value: 0, helper: "Transaksi normal pada latest transaction date" },
  potential_refund: { title: "Potential Refund", value: 0, helper: "Indikasi problem aktif pada latest transaction date" },
  refunded: { title: "Refunded", value: 0, helper: "Jumlah transaksi yang telah direfund pada latest transaction date" },
});

const getVoaTransactionSummaryReport = async () => {
  const pool = await reportPoolConnect;

  const result = await pool.request().query(`
    ;WITH latest_date AS (
      SELECT TOP 1 CAST(transaction_date AS date) AS latest_summary_date
      FROM v_rekon_voa_new
      WHERE transaction_date IS NOT NULL
      ORDER BY transaction_date DESC
    )
    SELECT
      ld.latest_summary_date,
      COUNT_BIG(v.ecomm_ref_no) AS total_transactions,
      SUM(CASE WHEN v.status_indikator = 'MATCHED' AND v.payment_status = 'SUCCESS' THEN 1 ELSE 0 END) AS matched_success,
      SUM(CASE WHEN v.status_indikator = 'POTENTIAL REFUND' THEN 1 ELSE 0 END) AS potential_refund,
      SUM(CASE WHEN v.status_indikator = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded
    FROM latest_date ld
    LEFT JOIN v_rekon_voa_new v
      ON v.transaction_date >= ld.latest_summary_date
      AND v.transaction_date < DATEADD(DAY, 1, ld.latest_summary_date)
    GROUP BY ld.latest_summary_date
    OPTION (RECOMPILE)
  `);

  const row = result.recordset[0];

  if (!row?.latest_summary_date) {
    return { cards: createEmptyCards() };
  }

  const latestDateLabel = formatDateLabel(row.latest_summary_date);

  return {
    cards: {
      total_transactions: {
        title: "Total Transactions",
        value: toNumber(row.total_transactions),
        helper: `Latest date ${latestDateLabel}`,
      },
      matched_success: {
        title: "Matched Success",
        value: toNumber(row.matched_success),
        helper: "Transaksi normal pada latest transaction date",
      },
      potential_refund: {
        title: "Potential Refund",
        value: toNumber(row.potential_refund),
        helper: "Indikasi problem aktif pada latest transaction date",
      },
      refunded: {
        title: "Refunded",
        value: toNumber(row.refunded),
        helper: "Jumlah transaksi yang telah direfund pada latest transaction date",
      },
    },
  };
};

module.exports = getVoaTransactionSummaryReport;
