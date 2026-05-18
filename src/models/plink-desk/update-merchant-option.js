const plink3DbPool = require("../../config/plink3-db");

const updateMerchantOption = async ({ merchantId, merchantName }) => {
  const client = await plink3DbPool.connect();

  try {
    const normalizedName = String(merchantName || "").trim();

    const result = await client.query(
      `
        UPDATE public.merchant
        SET merchant_name = $2
        WHERE merchant_code = $1
        RETURNING merchant_code AS merchant_id, merchant_name
      `,
      [merchantId, normalizedName]
    );

    if (!result.rows[0]) {
      const error = new Error("Merchant not found");
      error.statusCode = 404;
      throw error;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = updateMerchantOption;
