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

const getDefaultSnapshotDate = () => {
  const currentDate = new Date();

  return new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate() - 1
    )
  );
};

const runSnapshotQuery = async (pool, selectedSnapshotDate) => {
  const request = pool.request();
  request.input("snapshotDate", sql.Date, selectedSnapshotDate);

  const result = await request.query(`
    SELECT *
    INTO #recon_snapshot
    FROM v_summary_recon2
    WHERE trx_date = @snapshotDate;

    SELECT
      COUNT(*) AS total_rows,
      MAX(transaction_date) AS latest_transaction_date,
      MIN(transaction_date) AS earliest_transaction_date
    FROM #recon_snapshot;

    SELECT
      reconstatus,
      settle_flag,
      SUM(CAST(trx AS bigint)) AS total_volume,
      SUM(CAST(amount AS decimal(18,2))) AS total_amount,
      SUM(CAST(mdr_2 AS decimal(18,2))) AS total_mdr,
      SUM(CAST(transfer_amt AS decimal(18,2))) AS total_net_amount
    FROM #recon_snapshot
    GROUP BY reconstatus, settle_flag;

    SELECT
      trx_date,
      merchant_name,
      bank_name_1,
      reconstatus,
      SUM(CAST(trx AS bigint)) AS volume,
      SUM(CAST(amount AS decimal(18,2))) AS trx_amount,
      SUM(CAST(mdr_2 AS decimal(18,2))) AS mdr_amount,
      SUM(CAST(transfer_amt AS decimal(18,2))) AS net_amount
    FROM #recon_snapshot
    GROUP BY trx_date, merchant_name, bank_name_1, reconstatus
    ORDER BY trx_amount DESC, volume DESC, merchant_name ASC;
  `);

  return {
    metadata: result.recordsets?.[0]?.[0] || null,
    summaryRows: result.recordsets?.[1] || [],
    tableRows: result.recordsets?.[2] || [],
  };
};

const buildEmptyResponse = () => ({
  snapshot: null,
  summary_cards: [],
  table_rows: [],
  grand_total: null,
});

const getReconDashboardReport = async ({ snapshotDate }) => {
  const pool = await reportPoolConnect;

  let selectedSnapshotDate = normalizeDate(snapshotDate) || getDefaultSnapshotDate();
  let { metadata, summaryRows, tableRows } = await runSnapshotQuery(pool, selectedSnapshotDate);

  if (!snapshotDate && Number(metadata?.total_rows || 0) === 0) {
    const maxDateResult = await pool.request().query(`
      SELECT MAX(trx_date) AS latest_snapshot_date
      FROM v_summary_recon2
    `);

    selectedSnapshotDate = maxDateResult.recordset[0]?.latest_snapshot_date || null;

    if (!selectedSnapshotDate) {
      return buildEmptyResponse();
    }

    const fallbackResult = await runSnapshotQuery(pool, selectedSnapshotDate);
    metadata = fallbackResult.metadata;
    summaryRows = fallbackResult.summaryRows;
    tableRows = fallbackResult.tableRows;
  }

  if (!selectedSnapshotDate || Number(metadata?.total_rows || 0) === 0) {
    return buildEmptyResponse();
  }

  const totals = summaryRows.reduce(
    (accumulator, row) => {
      const volume = toNumber(row.total_volume);
      const amount = toNumber(row.total_amount);
      const mdr = toNumber(row.total_mdr);
      const netAmount = toNumber(row.total_net_amount);
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
    source_view: "v_summary_recon2",
    snapshot: {
      latest_snapshot_date: selectedSnapshotDate,
      latest_transaction_date: metadata?.latest_transaction_date || selectedSnapshotDate,
      current_snapshot_date: selectedSnapshotDate,
      earliest_transaction_date: metadata?.earliest_transaction_date || selectedSnapshotDate,
      total_rows: toNumber(metadata?.total_rows),
    },
    summary_cards: [
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
    table_rows: tableRows.map((row) => ({
      rk_date: row.trx_date,
      merchant_name: row.merchant_name,
      payment_channel: row.bank_name_1,
      status: row.reconstatus,
      volume: toNumber(row.volume),
      trx_amount: toNumber(row.trx_amount),
      mdr_amount: toNumber(row.mdr_amount),
      net_amount: toNumber(row.net_amount),
    })),
    grand_total: {
      volume: totals.total_processed.volume,
      trx_amount: totals.total_processed.amount,
      mdr_amount: totals.total_processed.mdr,
      net_amount: totals.total_processed.net_amount,
    },
  };
};

module.exports = getReconDashboardReport;
