const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const isUserCurrentlyBlocked = (user) =>
  Boolean(
    user?.is_blocked &&
    (!user.blocked_until || new Date(user.blocked_until).getTime() > Date.now())
  );

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, tokenUser) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
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
        return res.status(401).json({ message: 'User not found' });
      }

      const user = result.rows[0];
      if (isUserCurrentlyBlocked(user)) {
        return res.status(403).json({
          message: user.blocked_until
            ? `Your account is blocked until ${new Date(user.blocked_until).toLocaleString()}.`
            : 'Your account has been blocked by an administrator.',
        });
      }

      req.user = {
        ...user,
        is_admin: user.role === 'admin',
      };
      next();
    } catch (dbError) {
      console.error('Auth middleware error:', dbError);
      return res.status(500).json({ message: 'Authentication check failed' });
    }
  });
};

module.exports = authenticateToken;
