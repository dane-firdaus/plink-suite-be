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

const getLatestTransactionDate = async (pool) => {
  const result = await pool.request().query(`
    SELECT MAX(recon_date) AS latest_transaction_date
    FROM v_settle_jan23
  `);

  const latestDate = result.recordset[0]?.latest_transaction_date;

  if (!latestDate) {
    return null;
  }

  return normalizeDate(latestDate);
};

const getFinanceVipotDetailReport = async ({ rekonDate }) => {
  const pool = await reportPoolConnect;
  let selectedRekonDate = normalizeDate(rekonDate) || (await getLatestTransactionDate(pool));

  if (!selectedRekonDate) {
    return {
      snapshot: null,
      rows: [],
      grand_total: null,
    };
  }

  const runQuery = async (dateValue) => {
    const request = pool.request();
    request.input("rekonDate", sql.VarChar(10), dateValue);

    return request.query(`
      SELECT
        merchant_name,
        bank_settle,
        bank_account,
        bank_name,
        COUNT(*) AS volume,
        SUM(CAST(amount AS decimal(18,2))) AS amount,
        SUM(CAST(mdr_1 AS decimal(18,2))) AS mdr_total,
        SUM(CAST(ppn_value AS decimal(18,2))) AS ppn_total,
        SUM(CAST(pph_value AS decimal(18,2))) AS pph_total,
        SUM(CAST(mdr_2 AS decimal(18,2))) AS mdr_inc_total,
        SUM(CAST(transfer_amt AS decimal(18,2))) AS transfer_amt_final
      FROM v_settle_jan23
      WHERE CONVERT(varchar(10), transaction_date, 23) = @rekonDate
      GROUP BY merchant_name, bank_settle, bank_account, bank_name
      ORDER BY amount DESC, merchant_name ASC, bank_account ASC, bank_name ASC
    `);
  };

  let detailResult = await runQuery(selectedRekonDate);

  if (!rekonDate && (detailResult.recordset || []).length === 0) {
    selectedRekonDate = await getLatestTransactionDate(pool);

    if (!selectedRekonDate) {
      return {
        snapshot: null,
        rows: [],
        grand_total: null,
      };
    }

    detailResult = await runQuery(selectedRekonDate);
  }

  const rows = (detailResult.recordset || []).map((row) => ({
    merchant_name: row.merchant_name || "-",
    bank_account: row.bank_account || "-",
    bank_name: row.bank_name || "-",
    bank_settle: row.bank_settle || "-",
    volume: toNumber(row.volume),
    amount: toNumber(row.amount),
    mdr: toNumber(row.mdr_total),
    ppn: toNumber(row.ppn_total),
    pph: toNumber(row.pph_total),
    mdr_inc: toNumber(row.mdr_inc_total),
    transfer_amt: toNumber(row.transfer_amt_final),
  }));

  const grandTotal = rows.reduce(
    (accumulator, row) => {
      accumulator.volume += row.volume;
      accumulator.amount += row.amount;
      accumulator.mdr += row.mdr;
      accumulator.ppn += row.ppn;
      accumulator.pph += row.pph;
      accumulator.mdr_inc += row.mdr_inc;
      accumulator.transfer_amt += row.transfer_amt;
      return accumulator;
    },
    {
      volume: 0,
      amount: 0,
      mdr: 0,
      ppn: 0,
      pph: 0,
      mdr_inc: 0,
      transfer_amt: 0,
    }
  );

  const bankSettles = [...new Set(rows.map((row) => row.bank_settle).filter(Boolean))];

  return {
    snapshot: {
      rekon_date: selectedRekonDate,
      bank_settles: bankSettles,
      source_view: "v_settle_jan23",
    },
    rows,
    grand_total: grandTotal,
  };
};

module.exports = getFinanceVipotDetailReport;
