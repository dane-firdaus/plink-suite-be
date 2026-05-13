const dbPool = require("../../config/db");
const getCurrentUserProfile = require("./get-current-user-profile");

const updateCurrentUserProfile = async ({
  currentEmail,
  username,
  fullname,
  division_id,
}) => {
  const client = await dbPool.connect();

  try {
    const existingUser = await client.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [currentEmail]
    );

    if (!existingUser.rows[0]) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `
        UPDATE users
        SET
          username = $2,
          fullname = $3,
          division_id = $4,
          updated_at = NOW()
        WHERE LOWER(email) = LOWER($1)
      `,
      [currentEmail, username, fullname, division_id]
    );

    return getCurrentUserProfile({ email: currentEmail });
  } finally {
    client.release();
  }
};

module.exports = updateCurrentUserProfile;
