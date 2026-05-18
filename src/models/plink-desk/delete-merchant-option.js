const plink3DbPool = require("../../config/plink3-db");

const deleteMerchantOption = async (merchantId) => {
  const client = await plink3DbPool.connect();

  try {
    const result = await client.query(
      `
        UPDATE public.merchant
        SET is_active = 'N'
        WHERE merchant_code = $1
          AND COALESCE(is_active, 'Y') = 'Y'
        RETURNING merchant_code AS merchant_id, merchant_name
      `,
      [merchantId]
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

module.exports = deleteMerchantOption;
