const bcrypt = require("bcryptjs");
const dbPool = require("../../config/db");
const getUserByEmail = require("./get-user-by-email");

const changeCurrentUserPassword = async ({
  currentEmail,
  currentPassword,
  newPassword,
}) => {
  const client = await dbPool.connect();

  try {
    const user = await getUserByEmail(currentEmail);

    if (!user) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);

    if (!isPasswordValid) {
      const error = new Error("current password not match");
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      `
        UPDATE users
        SET
          password = $2,
          updated_at = NOW()
        WHERE LOWER(email) = LOWER($1)
      `,
      [currentEmail, bcrypt.hashSync(newPassword, 10)]
    );

    return {
      success: true,
    };
  } finally {
    client.release();
  }
};

module.exports = changeCurrentUserPassword;
