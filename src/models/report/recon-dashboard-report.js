const { sql, reportPoolConnect } = require("../../config/report-db");

const toNumber = (value) => Number(value || 0);

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const isoDateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const parsedDate = new Date(trimmedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return trimmedValue;
};

const getReconDataset = async (pool) => {
  const result = await pool.request().query(`
    SELECT
      COUNT(*) AS total_rows,
      MAX(trx_date) AS latest_trx_date,
      MIN(trx_date) AS earliest_trx_date,
      MAX(transaction_date) AS latest_transaction_date,
      MIN(transaction_date) AS earliest_transaction_date
    FROM v_summary_recon2;

    SELECT DISTINCT trx_date
    FROM v_summary_recon2
    WHERE trx_date IS NOT NULL
    ORDER BY trx_date DESC;

    SELECT
      trx_date,
      merchant_name,
      bank_name_1,
      reconstatus,
      settle_flag,
      SUM(CAST(trx AS bigint)) AS volume,
      SUM(CAST(amount AS decimal(18,2))) AS trx_amount,
      SUM(CAST(MDR_1 AS decimal(18,2))) AS mdr_amount,
      SUM(CAST(transfer_amt AS decimal(18,2))) AS net_amount
    FROM v_summary_recon2
    GROUP BY trx_date, merchant_name, bank_name_1, reconstatus, settle_flag
    ORDER BY trx_date DESC, trx_amount DESC, volume DESC, merchant_name ASC;
  `);

  return {
    metadata: result.recordsets?.[0]?.[0] || null,
    trxDates: (result.recordsets?.[1] || [])
      .map((row) => normalizeDate(row.trx_date))
      .filter(Boolean),
    tableRows: result.recordsets?.[2] || [],
  };
};

const buildEmptyResponse = () => ({
  snapshot: null,
  available_trx_dates: [],
  summary_cards: [],
  table_rows: [],
  grand_total: null,
});

const buildSummaryCards = (rows) => {
  const totals = rows.reduce(
    (accumulator, row) => {
      const volume = toNumber(row.volume);
      const amount = toNumber(row.trx_amount);
      const mdr = toNumber(row.mdr_amount);
      const netAmount = toNumber(row.net_amount);
      const status = String(row.reconstatus || "").toLowerCase();
      const settleFlag = String(row.settle_flag || "").toUpperCase();

      accumulator.total_processed.volume += volume;
      accumulator.total_processed.amount += amount;
      accumulator.total_processed.mdr += mdr;
      accumulator.total_processed.net_amount += netAmount;

      if (settleFlag === "N") {
        accumulator.unsettled.volume += volume;
        accumulator.unsettled.amount += amount;
      }

      if (status === "reconciled") {
        accumulator.reconciled.volume += volume;
        accumulator.reconciled.amount += amount;
      }

      if (status === "unreconciled") {
        accumulator.unreconciled.volume += volume;
        accumulator.unreconciled.amount += amount;
      }

      return accumulator;
    },
    {
      total_processed: { volume: 0, amount: 0, mdr: 0, net_amount: 0 },
      unsettled: { volume: 0, amount: 0 },
      reconciled: { volume: 0, amount: 0 },
      unreconciled: { volume: 0, amount: 0 },
    }
  );

  return {
    summaryCards: [
      {
        key: "total_processed",
        title: "Total Transaction Processed",
        short_label: "T",
        tone: "primary",
        volume: totals.total_processed.volume,
        amount: totals.total_processed.amount,
      },
      {
        key: "unsettled",
        title: "Un-Settled Transaction",
        short_label: "US",
        tone: "secondary",
        volume: totals.unsettled.volume,
        amount: totals.unsettled.amount,
      },
      {
        key: "reconciled",
        title: "Reconciled Transactions",
        short_label: "R",
        tone: "success",
        volume: totals.reconciled.volume,
        amount: totals.reconciled.amount,
      },
      {
        key: "unreconciled",
        title: "Un-Reconciled Transactions",
        short_label: "U",
        tone: "warning",
        volume: totals.unreconciled.volume,
        amount: totals.unreconciled.amount,
      },
    ],
    grandTotal: {
      volume: totals.total_processed.volume,
      trx_amount: totals.total_processed.amount,
      mdr_amount: totals.total_processed.mdr,
      net_amount: totals.total_processed.net_amount,
    },
  };
};

const getReconDashboardReport = async ({ snapshotDate, trxDate }) => {
  const pool = await reportPoolConnect;
  const { metadata, trxDates, tableRows } = await getReconDataset(pool);

  if (Number(metadata?.total_rows || 0) === 0 || !trxDates.length) {
    return buildEmptyResponse();
  }

  const normalizedRequestedDate = normalizeDate(trxDate || snapshotDate);
  const latestTrxDate = normalizeDate(metadata?.latest_trx_date) || normalizeDate(trxDates[0]);
  const selectedTrxDate =
    normalizedRequestedDate && trxDates.includes(normalizedRequestedDate) ? normalizedRequestedDate : latestTrxDate;

  const summarySourceRows = tableRows.filter((row) => normalizeDate(row.trx_date) === selectedTrxDate);
  const { summaryCards, grandTotal } = buildSummaryCards(summarySourceRows);

  return {
    source_view: "v_summary_recon2",
    snapshot: {
      latest_snapshot_date: latestTrxDate,
      latest_transaction_date: metadata?.latest_transaction_date || latestTrxDate,
      current_snapshot_date: selectedTrxDate,
      earliest_transaction_date: metadata?.earliest_transaction_date || metadata?.earliest_trx_date || latestTrxDate,
      total_rows: toNumber(metadata?.total_rows),
    },
    available_trx_dates: trxDates.map((value) => normalizeDate(value)).filter(Boolean),
    summary_cards: summaryCards,
    table_rows: tableRows.map((row) => ({
      rk_date: row.trx_date,
      merchant_name: row.merchant_name,
      payment_channel: row.bank_name_1,
      status: row.reconstatus,
      settle_flag: row.settle_flag,
      volume: toNumber(row.volume),
      trx_amount: toNumber(row.trx_amount),
      mdr_amount: toNumber(row.mdr_amount),
      net_amount: toNumber(row.net_amount),
    })),
    grand_total: grandTotal,
  };
};

module.exports = getReconDashboardReport;
