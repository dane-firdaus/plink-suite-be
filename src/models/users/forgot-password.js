const bcrypt = require("bcryptjs");
const dbPool = require("../../config/db");

const forgotPassword = async ({
  email,
  username,
  fullname,
  newPassword,
}) => {
  const client = await dbPool.connect();

  try {
    const result = await client.query(
      `
        UPDATE users
        SET
          password = $4,
          updated_at = NOW()
        WHERE LOWER(email) = LOWER($1)
          AND LOWER(username) = LOWER($2)
          AND LOWER(fullname) = LOWER($3)
        RETURNING id
      `,
      [email, username, fullname, bcrypt.hashSync(newPassword, 10)]
    );

    if (!result.rows[0]) {
      const error = new Error("user identity not match");
      error.statusCode = 400;
      throw error;
    }

    return {
      success: true,
    };
  } finally {
    client.release();
  }
};

module.exports = forgotPassword;
