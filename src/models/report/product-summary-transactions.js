const { sql, reportPoolConnect } = require("../../config/report-db");

const DEFAULT_DATE_LIMIT = 7;

const formatDateLabel = (dateValue) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));

const formatProductLabel = (value) =>
  String(value || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toNumber = (value) => Number(value || 0);

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

const getSummaryTotals = (products = []) =>
  products.reduce(
    (accumulator, product) => {
      Object.values(product.transactions || {}).forEach((transaction) => {
        accumulator.volume_trx += Number(transaction.volume_trx || 0);
        accumulator.nominal_trx += Number(transaction.nominal_trx || 0);
      });

      return accumulator;
    },
    { volume_trx: 0, nominal_trx: 0 }
  );

const getProductSummaryTransactions = async ({
  search = "",
  startDate,
  endDate,
  sortField = "volume_trx",
  sortOrder = "desc",
  sortDate,
}) => {
  const pool = await reportPoolConnect;
  const trimmedSearch = search.trim();

  const maxDateRequest = pool.request();
  maxDateRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  maxDateRequest.input("startDate", sql.Date, startDate || null);
  maxDateRequest.input("endDate", sql.Date, endDate || null);

  const maxDateResult = await maxDateRequest.query(`
    SELECT MAX(TRY_CONVERT(date, payment_date)) AS max_payment_date
    FROM v_report_dummy
    WHERE TRY_CONVERT(date, payment_date) IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(payment_type)), '') IS NOT NULL
      AND (@search = '' OR LTRIM(RTRIM(payment_type)) LIKE '%' + @search + '%')
      AND (@startDate IS NULL OR TRY_CONVERT(date, payment_date) >= @startDate)
      AND (@endDate IS NULL OR TRY_CONVERT(date, payment_date) <= @endDate);
  `);

  const maxPaymentDate = maxDateResult.recordset[0]?.max_payment_date;

  if (!maxPaymentDate) {
    return {
      data_products: [],
      month: [],
      summary: {
        volume_trx: 0,
        nominal_trx: 0,
      },
      sort: {
        field: sortField,
        order: sortOrder,
        date: "",
      },
    };
  }

  const effectiveStartDate = startDate || getDefaultStartDate(maxPaymentDate);
  const effectiveEndDate = endDate || maxPaymentDate;

  const summaryRequest = pool.request();
  summaryRequest.input("search", sql.VarChar(sql.MAX), trimmedSearch);
  summaryRequest.input("effectiveStartDate", sql.Date, effectiveStartDate);
  summaryRequest.input("effectiveEndDate", sql.Date, effectiveEndDate);

  const summaryResult = await summaryRequest.query(`
    SELECT
      LTRIM(RTRIM(payment_type)) AS payment_type,
      TRY_CONVERT(date, payment_date) AS transaction_date,
      SUM(CAST(volume AS decimal(18, 2))) AS volume_trx,
      SUM(CAST(amount AS decimal(18, 2))) AS nominal_trx
    FROM v_report_dummy
    WHERE TRY_CONVERT(date, payment_date) IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(payment_type)), '') IS NOT NULL
      AND (@search = '' OR LTRIM(RTRIM(payment_type)) LIKE '%' + @search + '%')
      AND TRY_CONVERT(date, payment_date) >= @effectiveStartDate
      AND TRY_CONVERT(date, payment_date) <= @effectiveEndDate
    GROUP BY
      LTRIM(RTRIM(payment_type)),
      TRY_CONVERT(date, payment_date)
    ORDER BY payment_type ASC, transaction_date ASC;
  `);

  const allRows = summaryResult.recordset || [];
  const dateSet = new Map();
  const productMap = new Map();

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

    if (!productMap.has(row.payment_type)) {
      productMap.set(row.payment_type, {});
    }

    productMap.get(row.payment_type)[dateKey] = {
      volume_trx: toNumber(row.volume_trx),
      nominal_trx: toNumber(row.nominal_trx),
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
  const effectiveSortDate =
    sortDate && orderedDateLabels.includes(sortDate)
      ? sortDate
      : orderedDates[orderedDates.length - 1]?.label || "";

  const products = Array.from(productMap.entries())
    .map(([paymentType, transactionMap]) => {
      const labeledTransactions = {};

      orderedDates.forEach((dateItem) => {
        labeledTransactions[dateItem.label] = transactionMap[dateItem.key] || {
          volume_trx: 0,
          nominal_trx: 0,
        };
      });

      const sortValue =
        sortField === "payment_type"
          ? paymentType.toLowerCase()
          : Number(labeledTransactions[effectiveSortDate]?.[sortField] || 0);

      return {
        payment_type: paymentType,
        product_label: formatProductLabel(paymentType),
        transactions: labeledTransactions,
        sort_value: sortValue,
      };
    })
    .filter((product) =>
      orderedDateKeys.some((_, index) => {
        const dateLabel = orderedDateLabels[index];
        const transaction = product.transactions[dateLabel];
        return transaction && (transaction.volume_trx > 0 || transaction.nominal_trx > 0);
      })
    );

  products.sort((leftProduct, rightProduct) => {
    if (sortField === "payment_type") {
      const nameComparison = leftProduct.sort_value.localeCompare(rightProduct.sort_value);
      return sortOrder === "asc" ? nameComparison : -nameComparison;
    }

    if (leftProduct.sort_value !== rightProduct.sort_value) {
      return sortOrder === "asc"
        ? leftProduct.sort_value - rightProduct.sort_value
        : rightProduct.sort_value - leftProduct.sort_value;
    }

    return leftProduct.product_label.localeCompare(rightProduct.product_label);
  });

  return {
    data_products: products.map((product) => ({
      payment_type: product.payment_type,
      product_label: product.product_label,
      transactions: product.transactions,
    })),
    month: orderedDateLabels,
    summary: getSummaryTotals(products),
    sort: {
      field: sortField,
      order: sortOrder,
      date: effectiveSortDate,
    },
  };
};

module.exports = getProductSummaryTransactions;
