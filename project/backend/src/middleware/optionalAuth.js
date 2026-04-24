const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const isUserCurrentlyBlocked = (user) =>
  Boolean(
    user?.is_blocked &&
    (!user.blocked_until || new Date(user.blocked_until).getTime() > Date.now())
  );

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, tokenUser) => {
    if (err) {
      req.user = null;
      return next();
    }

    try {
      const result = await pool.query(
        `SELECT id, username, email, role, is_blocked, blocked_until, blocked_reason,
                storage_limit_bytes, daily_transfer_limit_bytes
         FROM users
         WHERE id = $1`,
        [tokenUser.id]
      );

      if (!result.rows.length) {
        req.user = null;
        return next();
      }

      const user = result.rows[0];
      req.user = isUserCurrentlyBlocked(user)
        ? null
        : {
            ...user,
            is_admin: user.role === 'admin',
          };
      next();
    } catch (dbError) {
      console.error('Optional auth middleware error:', dbError);
      req.user = null;
      next();
    }
  });
};

module.exports = optionalAuthenticateToken;
