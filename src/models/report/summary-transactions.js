const { sql, reportPoolConnect } = require("../../config/report-db");

const DEFAULT_LIMIT = 50;
const DEFAULT_DATE_LIMIT = 7;

const formatDateLabel = (dateValue) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));

const normalizePaymentType = (paymentType) =>
  String(paymentType || "").trim().toLowerCase();

const toNumber = (value) => Number(value || 0);

const getDateTotals = (transactionByDate = {}) =>
  Object.values(transactionByDate.type || {}).reduce(
    (accumulator, transactionType) => ({
      volume_trx: accumulator.volume_trx + Number(transactionType.volume_trx || 0),
      nominal_trx: accumulator.nominal_trx + Number(transactionType.nominal_trx || 0),
    }),
    { volume_trx: 0, nominal_trx: 0 }
  );

const getSummaryTotals = (merchants = []) =>
  merchants.reduce(
    (accumulator, merchant) => {
      Object.values(merchant.transactions || {}).forEach((transactionByDate) => {
        const dateTotals = getDateTotals(transactionByDate);
        accumulator.volume_trx += dateTotals.volume_trx;
        accumulator.nominal_trx += dateTotals.nominal_trx;
      });

      return accumulator;
    },
    { volume_trx: 0, nominal_trx: 0 }
  );

const getSummaryByDate = (merchants = [], orderedDateLabels = []) =>
  orderedDateLabels.reduce((accumulator, dateLabel) => {
    accumulator[dateLabel] = merchants.reduce(
      (dateAccumulator, merchant) => {
        const dateTotals = getDateTotals(merchant.transactions?.[dateLabel] || {});
        dateAccumulator.volume_trx += dateTotals.volume_trx;
        dateAccumulator.nominal_trx += dateTotals.nominal_trx;

        return dateAccumulator;
      },
      { volume_trx: 0, nominal_trx: 0 }
    );

    return accumulator;
  }, {});

const getDefaultStartDate = (maxDateValue) => {
  const maxDate = new Date(maxDateValue);
  return new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() - (DEFAULT_DATE_LIMIT - 1)));
};

const getSummaryTransactions = async ({
  page = 1,
  limit = DEFAULT_LIMIT,
  search = "",
  startDate,
  endDate,
  sortField = "volume_trx",
  sortOrder = "desc",
  sortDate,
  paymentType,
}) => {
  const pool = await reportPoolConnect;
  const trimmedSearch = search.trim();
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || DEFAULT_LIMIT, 1);
  const offset = (safePage - 1) * safeLimit;

  const maxDateRequest = pool.request();
  maxDateRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  maxDateRequest.input("startDate", sql.Date, startDate || null);
  maxDateRequest.input("endDate", sql.Date, endDate || null);
  maxDateRequest.input("paymentType", sql.VarChar(sql.MAX), paymentType || null);

  const maxDateResult = await maxDateRequest.query(`
    SELECT MAX(TRY_CONVERT(date, payment_date)) AS max_payment_date
    FROM v_report_dummy
    WHERE TRY_CONVERT(date, payment_date) IS NOT NULL
      AND (@search = '' OR merchant_name LIKE '%' + @search + '%')
      AND (@startDate IS NULL OR TRY_CONVERT(date, payment_date) >= @startDate)
      AND (@endDate IS NULL OR TRY_CONVERT(date, payment_date) <= @endDate)
      AND (@paymentType IS NULL OR LTRIM(RTRIM(payment_type)) = @paymentType);
  `);

  const maxPaymentDate = maxDateResult.recordset[0]?.max_payment_date;

  if (!maxPaymentDate) {
    return {
      data_transactions: [],
      month: [],
      pagination: {
        totalData: 0,
        totalPage: 0,
        rowPerPage: safeLimit,
        currentPage: safePage,
      },
    };
  }

  const effectiveStartDate = startDate || getDefaultStartDate(maxPaymentDate);
  const effectiveEndDate = endDate || maxPaymentDate;

  const summaryRequest = pool.request();
  summaryRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  summaryRequest.input("effectiveStartDate", sql.Date, effectiveStartDate);
  summaryRequest.input("effectiveEndDate", sql.Date, effectiveEndDate);
  summaryRequest.input("paymentType", sql.VarChar(sql.MAX), paymentType || null);

  const summaryResult = await summaryRequest.query(`
    SELECT
      LTRIM(RTRIM(merchant_name)) AS merchant_name,
      TRY_CONVERT(date, payment_date) AS transaction_date,
      LTRIM(RTRIM(payment_type)) AS payment_type,
      SUM(CAST(volume AS decimal(18, 2))) AS volume_trx,
      SUM(CAST(amount AS decimal(18, 2))) AS nominal_trx
    FROM v_report_dummy
    WHERE TRY_CONVERT(date, payment_date) IS NOT NULL
      AND (@search = '' OR merchant_name LIKE '%' + @search + '%')
      AND TRY_CONVERT(date, payment_date) >= @effectiveStartDate
      AND TRY_CONVERT(date, payment_date) <= @effectiveEndDate
      AND (@paymentType IS NULL OR LTRIM(RTRIM(payment_type)) = @paymentType)
    GROUP BY
      LTRIM(RTRIM(merchant_name)),
      TRY_CONVERT(date, payment_date),
      LTRIM(RTRIM(payment_type))
    ORDER BY merchant_name ASC, transaction_date ASC, payment_type ASC;
  `);

  const allRows = summaryResult.recordset || [];
  const dateSet = new Map();
  const merchantMap = new Map();

  allRows.forEach((row) => {
    const transactionDate = new Date(row.transaction_date);
    const dateKey = transactionDate.toISOString().slice(0, 10);

    if (!dateSet.has(dateKey)) {
      dateSet.set(dateKey, {
        key: dateKey,
        label: formatDateLabel(transactionDate),
        date: transactionDate,
      });
    }

    if (!merchantMap.has(row.merchant_name)) {
      merchantMap.set(row.merchant_name, {});
    }

    const merchantTransactions = merchantMap.get(row.merchant_name);

    if (!merchantTransactions[dateKey]) {
      merchantTransactions[dateKey] = { type: {} };
    }

    merchantTransactions[dateKey].type[normalizePaymentType(row.payment_type)] = {
      volume_trx: toNumber(row.volume_trx),
      nominal_trx: toNumber(row.nominal_trx),
      revenue: 0,
    };
  });

  let orderedDates = Array.from(dateSet.values()).sort(
    (leftDate, rightDate) => leftDate.date - rightDate.date
  );

  if (!startDate && !endDate && orderedDates.length > DEFAULT_DATE_LIMIT) {
    orderedDates = orderedDates.slice(-DEFAULT_DATE_LIMIT);
  }

  const orderedDateKeys = orderedDates.map((dateItem) => dateItem.key);
  const orderedDateLabels = orderedDates.map((dateItem) => dateItem.label);
  const sortDateLabel =
    sortDate && orderedDateLabels.includes(sortDate)
      ? sortDate
      : orderedDates[orderedDates.length - 1]?.label;

  const merchantNames = Array.from(merchantMap.keys()).filter((merchantName) => {
    const merchantTransactions = merchantMap.get(merchantName);
    return orderedDateKeys.some((dateKey) => merchantTransactions[dateKey]);
  });

  const sortableMerchants = merchantNames.map((merchantName) => {
    const merchantTransactions = merchantMap.get(merchantName) || {};
    const labeledTransactions = {};

    orderedDates.forEach((dateItem) => {
      labeledTransactions[dateItem.label] = merchantTransactions[dateItem.key] || { type: {} };
    });

    const sortTotals = getDateTotals(labeledTransactions[sortDateLabel] || {});

    return {
      merchant_name: merchantName,
      transactions: labeledTransactions,
      sort_value:
        sortField === "merchant_name"
          ? merchantName.toLowerCase()
          : Number(sortTotals[sortField] || 0),
    };
  });

  sortableMerchants.sort((leftMerchant, rightMerchant) => {
    if (sortField === "merchant_name") {
      const nameComparison = leftMerchant.sort_value.localeCompare(rightMerchant.sort_value);
      return sortOrder === "asc" ? nameComparison : -nameComparison;
    }

    if (leftMerchant.sort_value !== rightMerchant.sort_value) {
      return sortOrder === "asc"
        ? leftMerchant.sort_value - rightMerchant.sort_value
        : rightMerchant.sort_value - leftMerchant.sort_value;
    }

    return leftMerchant.merchant_name.localeCompare(rightMerchant.merchant_name);
  });

  const pagedMerchants = sortableMerchants.slice(offset, offset + safeLimit);

  const dataTransactions = pagedMerchants.map((merchant) => ({
    merchant_name: merchant.merchant_name,
    transactions: merchant.transactions,
  }));

  return {
    data_transactions: dataTransactions,
    month: orderedDates.map((dateItem) => dateItem.label),
    summary: getSummaryTotals(sortableMerchants),
    summary_by_date: getSummaryByDate(sortableMerchants, orderedDateLabels),
    sort: {
      field: sortField,
      order: sortOrder,
      date: sortDateLabel,
    },
    pagination: {
      totalData: sortableMerchants.length,
      totalPage: Math.ceil(sortableMerchants.length / safeLimit),
      rowPerPage: safeLimit,
      currentPage: safePage,
    },
  };
};

module.exports = getSummaryTransactions;
