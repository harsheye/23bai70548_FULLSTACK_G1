const pool = require('../config/database');

const searchUsers = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const result = query.length < 1
      ? await pool.query(
          `SELECT id, username, email
           FROM users
           WHERE id != $1
           ORDER BY username ASC
           LIMIT 5`,
          [req.user.id]
        )
      : await pool.query(
          `SELECT id, username, email
           FROM users
           WHERE id != $1
             AND (
               username ILIKE $2
               OR email ILIKE $2
             )
           ORDER BY
             CASE WHEN username ILIKE $3 THEN 0 ELSE 1 END,
             username ASC
           LIMIT 5`,
          [req.user.id, `%${query}%`, `${query}%`]
        );

    res.json(result.rows);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  searchUsers,
};
