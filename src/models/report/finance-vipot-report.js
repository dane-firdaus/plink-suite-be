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

const getLatestRekonDate = async (pool) => {
  const result = await pool.request().query(`
    SELECT MAX(RTRIM(LTRIM(rekon_date))) AS latest_rekon_date
    FROM v_settle_fee_jan23
  `);

  return result.recordset[0]?.latest_rekon_date || null;
};

const getAvailableRekonDates = async (pool) => {
  const result = await pool.request().query(`
    SELECT DISTINCT RTRIM(LTRIM(rekon_date)) AS rekon_date
    FROM v_settle_fee_jan23
    WHERE RTRIM(LTRIM(rekon_date)) <> ''
    ORDER BY RTRIM(LTRIM(rekon_date)) DESC
  `);

  return (result.recordset || [])
    .map((row) => row.rekon_date)
    .filter(Boolean);
};

const getFinanceVipotReport = async ({ transactionDate } = {}) => {
  const pool = await reportPoolConnect;
  const availableRekonDates = await getAvailableRekonDates(pool);
  const latestRekonDate = availableRekonDates[0] || (await getLatestRekonDate(pool));
  const requestedRekonDate = normalizeDate(transactionDate);
  const selectedRekonDate =
    requestedRekonDate && availableRekonDates.includes(requestedRekonDate)
      ? requestedRekonDate
      : latestRekonDate;

  if (!selectedRekonDate) {
    return {
      snapshot: null,
      groups: [],
      grand_total: null,
      available_rekon_dates: [],
    };
  }

  const runQuery = async (dateValue) => {
    const parentRequest = pool.request();
    parentRequest.input("rekonDate", sql.VarChar(10), dateValue);

    const childRequest = pool.request();
    childRequest.input("rekonDate", sql.VarChar(10), dateValue);

    return Promise.all([
      parentRequest.query(`
        SELECT
          bank_source,
          SUM(CAST(transfer_amt AS decimal(18,2))) AS transfer_amt,
          SUM(CAST(settle_fee AS decimal(18,2))) AS biaya_pelimpahan,
          SUM(CAST(nett_transfer_amt AS decimal(18,2))) AS nett_transfer_amt
        FROM v_settle_fee_jan23
        WHERE RTRIM(LTRIM(rekon_date)) = @rekonDate
        GROUP BY bank_source
        ORDER BY transfer_amt DESC, bank_source ASC
      `),
      childRequest.query(`
        SELECT
          bank_source,
          merchant_name,
          bank_settle,
          bank_account,
          account_name,
          transfer_status,
          SUM(CAST(transfer_amt AS decimal(18,2))) AS transfer_amt,
          SUM(CAST(settle_fee AS decimal(18,2))) AS biaya_pelimpahan,
          SUM(CAST(nett_transfer_amt AS decimal(18,2))) AS nett_transfer_amt
        FROM v_settle_fee_jan23
        WHERE RTRIM(LTRIM(rekon_date)) = @rekonDate
        GROUP BY bank_source, merchant_name, bank_settle, bank_account, account_name, transfer_status
        ORDER BY bank_source ASC, transfer_amt DESC, merchant_name ASC
      `),
    ]);
  };

  const [parentResult, childResult] = await runQuery(selectedRekonDate);

  const childBySource = new Map();

  for (const row of childResult.recordset || []) {
    const source = row.bank_source || "-";

    if (!childBySource.has(source)) {
      childBySource.set(source, []);
    }

    childBySource.get(source).push({
      merchant_name: row.merchant_name || "-",
      bank_settle: row.bank_settle || "-",
      bank_account: row.bank_account || "-",
      account_name: row.account_name || "-",
      status: row.transfer_status || "-",
      transfer_amt: toNumber(row.transfer_amt),
      biaya_pelimpahan: Math.abs(toNumber(row.biaya_pelimpahan)),
      nett_transfer_amt: toNumber(row.nett_transfer_amt),
    });
  }

  const groups = (parentResult.recordset || []).map((row) => {
    const source = row.bank_source || "-";

    return {
      group_label: source,
      bank_source: source,
      transfer_amt: toNumber(row.transfer_amt),
      biaya_pelimpahan: Math.abs(toNumber(row.biaya_pelimpahan)),
      nett_transfer_amt: toNumber(row.nett_transfer_amt),
      items: childBySource.get(source) || [],
    };
  });

  const grandTotal = groups.reduce(
    (accumulator, group) => {
      accumulator.transfer_amt += group.transfer_amt;
      accumulator.biaya_pelimpahan += group.biaya_pelimpahan;
      accumulator.nett_transfer_amt += group.nett_transfer_amt;
      return accumulator;
    },
    {
      transfer_amt: 0,
      biaya_pelimpahan: 0,
      nett_transfer_amt: 0,
    }
  );

  return {
    snapshot: {
      current_transaction_date: selectedRekonDate,
      latest_transaction_date: latestRekonDate,
    },
    groups,
    grand_total: grandTotal,
    available_rekon_dates: availableRekonDates,
  };
};

module.exports = getFinanceVipotReport;
