const { sql, reportPoolConnect } = require("../../config/report-db");

const CACHE_TTL_MS = 5 * 60 * 1000;
const reconCache = new Map();

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

const getCacheEntry = (key) => {
  const entry = reconCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    reconCache.delete(key);
    return null;
  }

  return entry;
};

const readThroughCache = async (key, loader, ttlMs = CACHE_TTL_MS) => {
  const currentEntry = getCacheEntry(key);

  if (currentEntry?.value !== undefined) {
    return currentEntry.value;
  }

  if (currentEntry?.promise) {
    return currentEntry.promise;
  }

  const pendingPromise = (async () => {
    try {
      const value = await loader();
      reconCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    } catch (error) {
      reconCache.delete(key);
      throw error;
    }
  })();

  reconCache.set(key, {
    promise: pendingPromise,
    expiresAt: Date.now() + ttlMs,
  });

  return pendingPromise;
};

const getReconMetadata = async (pool) => {
  return readThroughCache("recon:metadata", async () => {
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total_rows,
        MAX(trx_date) AS latest_trx_date,
        MIN(trx_date) AS earliest_trx_date,
        MAX(transaction_date) AS latest_transaction_date,
        MIN(transaction_date) AS earliest_transaction_date
      FROM v_summary_recon2;
    `);

    return result.recordset?.[0] || null;
  });
};

const getReconTrxDates = async (pool) => {
  return readThroughCache("recon:trx_dates", async () => {
    const result = await pool.request().query(`
      SELECT TOP (31) trx_date
      FROM v_summary_recon2
      WHERE trx_date IS NOT NULL
      GROUP BY trx_date
      ORDER BY trx_date DESC;
    `);

    return (result.recordset || [])
      .map((row) => normalizeDate(row.trx_date))
      .filter(Boolean);
  });
};

const getLatestReconTrxDate = async (pool) => {
  return readThroughCache("recon:latest_trx_date", async () => {
    const result = await pool.request().query(`
      SELECT MAX(trx_date) AS latest_trx_date
      FROM v_summary_recon2;
    `);

    return normalizeDate(result.recordset?.[0]?.latest_trx_date);
  });
};

const getReconRowsByDate = async (pool, trxDate) => {
  const normalizedTrxDate = normalizeDate(trxDate);

  return readThroughCache(`recon:rows:${normalizedTrxDate}`, async () => {
    const request = pool.request();

    request.input("trxDate", sql.Date, normalizedTrxDate);

    const result = await request.query(`
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
      WHERE trx_date = @trxDate
      GROUP BY trx_date, merchant_name, bank_name_1, reconstatus, settle_flag
      ORDER BY trx_amount DESC, volume DESC, merchant_name ASC;
    `);

    return result.recordset || [];
  });
};

const buildEmptyResponse = () => ({
  snapshot: null,
  available_trx_dates: [],
  summary_cards: [],
  table_rows: [],
  grand_total: null,
});

const buildEmptyOverviewResponse = () => ({
  source_view: "v_summary_recon2",
  current_snapshot_date: null,
  latest_snapshot_date: null,
  available_trx_dates: [],
});

const buildEmptySnapshotMetaResponse = () => ({
  source_view: "v_summary_recon2",
  snapshot: null,
});

const buildEmptySummaryResponse = () => ({
  current_snapshot_date: null,
  summary_cards: [],
  grand_total: null,
});

const buildEmptyTableResponse = () => ({
  current_snapshot_date: null,
  table_rows: [],
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

const resolveSelectedTrxDate = ({ metadata, trxDates, snapshotDate, trxDate }) => {
  const normalizedRequestedDate = normalizeDate(trxDate || snapshotDate);
  const latestTrxDate = normalizeDate(metadata?.latest_trx_date) || normalizeDate(trxDates[0]);
  const selectedTrxDate =
    normalizedRequestedDate && trxDates.includes(normalizedRequestedDate) ? normalizedRequestedDate : latestTrxDate;

  return {
    latestTrxDate,
    selectedTrxDate,
  };
};

const resolveSelectedOrLatestTrxDate = async (pool, { snapshotDate, trxDate }) => {
  const normalizedRequestedDate = normalizeDate(trxDate || snapshotDate);

  if (normalizedRequestedDate) {
    return normalizedRequestedDate;
  }

  return getLatestReconTrxDate(pool);
};

const mapTableRows = (tableRows) =>
  tableRows.map((row) => ({
    rk_date: row.trx_date,
    merchant_name: row.merchant_name,
    payment_channel: row.bank_name_1,
    status: row.reconstatus,
    settle_flag: row.settle_flag,
    volume: toNumber(row.volume),
    trx_amount: toNumber(row.trx_amount),
    mdr_amount: toNumber(row.mdr_amount),
    net_amount: toNumber(row.net_amount),
  }));

const getReconDashboardOverview = async ({ snapshotDate, trxDate }) => {
  const pool = await reportPoolConnect;
  const trxDates = await getReconTrxDates(pool);

  if (!trxDates.length) {
    return buildEmptyOverviewResponse();
  }

  const latestTrxDate = normalizeDate(trxDates[0]);
  const normalizedRequestedDate = normalizeDate(trxDate || snapshotDate);
  const selectedTrxDate =
    normalizedRequestedDate && trxDates.includes(normalizedRequestedDate) ? normalizedRequestedDate : latestTrxDate;

  return {
    source_view: "v_summary_recon2",
    current_snapshot_date: selectedTrxDate,
    latest_snapshot_date: latestTrxDate,
    available_trx_dates: trxDates.map((value) => normalizeDate(value)).filter(Boolean),
  };
};

const getReconDashboardSnapshotMeta = async ({ snapshotDate, trxDate }) => {
  const pool = await reportPoolConnect;
  const selectedTrxDate = await resolveSelectedOrLatestTrxDate(pool, { snapshotDate, trxDate });

  if (!selectedTrxDate) {
    return buildEmptySnapshotMetaResponse();
  }
  const latestTrxDate = await getLatestReconTrxDate(pool);
  const rows = await getReconRowsByDate(pool, selectedTrxDate);

  if (!latestTrxDate || !rows.length) {
    return buildEmptySnapshotMetaResponse();
  }

  const totalRows = rows.reduce((sum, row) => sum + toNumber(row.volume), 0);

  return {
    source_view: "v_summary_recon2",
    snapshot: {
      latest_snapshot_date: latestTrxDate,
      latest_transaction_date: selectedTrxDate,
      current_snapshot_date: selectedTrxDate,
      earliest_transaction_date: selectedTrxDate,
      total_rows: totalRows,
    },
  };
};

const getReconDashboardSummaryCards = async ({ snapshotDate, trxDate }) => {
  const pool = await reportPoolConnect;
  const selectedTrxDate = await resolveSelectedOrLatestTrxDate(pool, { snapshotDate, trxDate });

  if (!selectedTrxDate) {
    return buildEmptySummaryResponse();
  }
  const summarySourceRows = await getReconRowsByDate(pool, selectedTrxDate);
  const { summaryCards, grandTotal } = buildSummaryCards(summarySourceRows);

  return {
    current_snapshot_date: selectedTrxDate,
    summary_cards: summaryCards,
    grand_total: grandTotal,
  };
};

const getReconDashboardTable = async ({ snapshotDate, trxDate }) => {
  const pool = await reportPoolConnect;
  const selectedTrxDate = await resolveSelectedOrLatestTrxDate(pool, { snapshotDate, trxDate });

  if (!selectedTrxDate) {
    return buildEmptyTableResponse();
  }
  const tableRows = await getReconRowsByDate(pool, selectedTrxDate);

  return {
    current_snapshot_date: selectedTrxDate,
    table_rows: mapTableRows(tableRows),
  };
};

const getReconDashboardReport = async ({ snapshotDate, trxDate }) => {
  return getReconDashboardOverview({ snapshotDate, trxDate });
};

const warmReconDashboardCache = async () => {
  try {
    const pool = await reportPoolConnect;
    const trxDates = await getReconTrxDates(pool);

    if (!trxDates.length) {
      return;
    }

    await Promise.all([
      getLatestReconTrxDate(pool),
      getReconMetadata(pool),
      getReconRowsByDate(pool, trxDates[0]),
    ]);
  } catch (error) {
    console.log("Failed to warm recon dashboard cache", error.message);
  }
};

module.exports = getReconDashboardReport;
module.exports.getReconDashboardOverview = getReconDashboardOverview;
module.exports.getReconDashboardSnapshotMeta = getReconDashboardSnapshotMeta;
module.exports.getReconDashboardSummaryCards = getReconDashboardSummaryCards;
module.exports.getReconDashboardTable = getReconDashboardTable;
module.exports.warmReconDashboardCache = warmReconDashboardCache;
