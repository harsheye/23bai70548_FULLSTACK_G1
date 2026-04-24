const pool = require('../config/database');
const { getUserDailyUsage } = require('../services/runtimeLimits');

const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const DEFAULT_TRANSFER_LIMIT_BYTES = 500 * 1024 * 1024;

const BLOCK_UNITS = {
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

const logAdminAction = async (adminUserId, targetUserId, actionType, details = {}) => {
  await pool.query(
    `INSERT INTO admin_action_logs (admin_user_id, target_user_id, action_type, details)
     VALUES ($1, $2, $3, $4)`,
    [adminUserId, targetUserId, actionType, JSON.stringify(details)]
  );
};

const listUsers = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const result = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.role,
         u.is_blocked,
         u.blocked_until,
         u.blocked_reason,
         u.storage_limit_bytes,
         u.daily_transfer_limit_bytes,
         u.created_at,
         COALESCE(SUM(f.file_size), 0) AS storage_used_bytes,
         COUNT(f.id) AS file_count
       FROM users u
       LEFT JOIN files f ON f.user_id = u.id
       WHERE ($1 = '' OR u.username ILIKE $2 OR u.email ILIKE $2)
       GROUP BY
         u.id, u.username, u.email, u.role, u.is_blocked, u.blocked_until, u.blocked_reason,
         u.storage_limit_bytes, u.daily_transfer_limit_bytes, u.created_at
       ORDER BY
         CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END,
         u.created_at ASC`,
      [query, `%${query}%`]
    );

    const users = await Promise.all(
      result.rows.map(async (row) => {
        const usage = await getUserDailyUsage(row.id);
        return {
        ...row,
        file_count: Number(row.file_count || 0),
        storage_used_bytes: Number(row.storage_used_bytes || 0),
        storage_limit_bytes: Number(row.storage_limit_bytes || DEFAULT_STORAGE_LIMIT_BYTES),
        daily_transfer_limit_bytes: Number(row.daily_transfer_limit_bytes || DEFAULT_TRANSFER_LIMIT_BYTES),
        daily_upload_bytes: Number(usage.upload_bytes || 0),
        daily_download_bytes: Number(usage.download_bytes || 0),
        is_admin: row.role === 'admin',
        };
      })
    );

    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Failed to load users', error: error.message });
  }
};

const updateUserControls = async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    const {
      role,
      storageLimitBytes,
      dailyTransferLimitBytes,
      blockMode,
      blockAmount,
      blockUnit,
      blockReason,
    } = req.body;

    const targetResult = await pool.query(
      `SELECT id, username, role
       FROM users
       WHERE id = $1`,
      [targetUserId]
    );

    if (!targetResult.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUserId === Number(req.user.id) && role && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role' });
    }

    if (targetResult.rows[0].role === 'admin' && role === 'user') {
      const adminCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = 'admin'`
      );
      if (Number(adminCountResult.rows[0]?.count || 0) <= 1) {
        return res.status(400).json({ message: 'At least one admin must remain in the system' });
      }
    }

    let nextBlockedUntil = null;
    let nextBlocked = false;
    if (blockMode === 'temporary') {
      const amount = Math.max(Number(blockAmount) || 0, 1);
      const unitMs = BLOCK_UNITS[blockUnit] || BLOCK_UNITS.days;
      nextBlockedUntil = new Date(Date.now() + amount * unitMs);
      nextBlocked = true;
    } else if (blockMode === 'permanent') {
      nextBlocked = true;
    }

    const nextRole = role === 'admin' ? 'admin' : role === 'user' ? 'user' : targetResult.rows[0].role;
    const nextStorageLimit = Math.max(Number(storageLimitBytes) || DEFAULT_STORAGE_LIMIT_BYTES, 1);
    const nextTransferLimit = Math.max(Number(dailyTransferLimitBytes) || DEFAULT_TRANSFER_LIMIT_BYTES, 1);
    const nextReason = nextBlocked ? (blockReason || '').trim() || null : null;

    const result = await pool.query(
      `UPDATE users
       SET role = $2,
           storage_limit_bytes = $3,
           daily_transfer_limit_bytes = $4,
           is_blocked = $5,
           blocked_until = $6,
           blocked_reason = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, email, role, is_blocked, blocked_until, blocked_reason,
                 storage_limit_bytes, daily_transfer_limit_bytes, created_at`,
      [targetUserId, nextRole, nextStorageLimit, nextTransferLimit, nextBlocked, nextBlockedUntil, nextReason]
    );

    await logAdminAction(req.user.id, targetUserId, 'user_updated', {
      role: nextRole,
      storageLimitBytes: nextStorageLimit,
      dailyTransferLimitBytes: nextTransferLimit,
      blockMode: blockMode || 'none',
      blockUntil: nextBlockedUntil,
      blockReason: nextReason,
    });

    res.json({
      message: 'User controls updated successfully',
      user: {
        ...result.rows[0],
        storage_limit_bytes: Number(result.rows[0].storage_limit_bytes || DEFAULT_STORAGE_LIMIT_BYTES),
        daily_transfer_limit_bytes: Number(result.rows[0].daily_transfer_limit_bytes || DEFAULT_TRANSFER_LIMIT_BYTES),
        is_admin: result.rows[0].role === 'admin',
      },
    });
  } catch (error) {
    console.error('Admin update user controls error:', error);
    res.status(500).json({ message: 'Failed to update user controls', error: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    const result = await pool.query(
      `UPDATE users
       SET is_blocked = FALSE,
           blocked_until = NULL,
           blocked_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username`,
      [targetUserId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAdminAction(req.user.id, targetUserId, 'user_unblocked');

    res.json({ message: 'User unblocked successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Admin unblock user error:', error);
    res.status(500).json({ message: 'Failed to unblock user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);

    if (targetUserId === Number(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account from the admin panel' });
    }

    const targetResult = await pool.query(
      `SELECT id, username, role
       FROM users
       WHERE id = $1`,
      [targetUserId]
    );

    if (!targetResult.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetResult.rows[0].role === 'admin') {
      const adminCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = 'admin'`
      );
      if (Number(adminCountResult.rows[0]?.count || 0) <= 1) {
        return res.status(400).json({ message: 'At least one admin must remain in the system' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);
    await logAdminAction(req.user.id, targetUserId, 'user_deleted', {
      username: targetResult.rows[0].username,
      role: targetResult.rows[0].role,
    });

    res.json({ message: 'User deleted permanently' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

const getAdminLogs = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const result = await pool.query(
      `SELECT
         aal.id,
         aal.action_type,
         aal.details,
         aal.created_at,
         admin_user.username AS admin_username,
         target_user.username AS target_username,
         target_user.email AS target_email
       FROM admin_action_logs aal
       JOIN users admin_user ON admin_user.id = aal.admin_user_id
       LEFT JOIN users target_user ON target_user.id = aal.target_user_id
       WHERE (
         $1 = ''
         OR admin_user.username ILIKE $2
         OR COALESCE(target_user.username, '') ILIKE $2
         OR COALESCE(target_user.email, '') ILIKE $2
         OR aal.action_type ILIKE $2
       )
       ORDER BY aal.created_at DESC
       LIMIT 100`,
      [query, `%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ message: 'Failed to load admin logs', error: error.message });
  }
};

module.exports = {
  listUsers,
  updateUserControls,
  unblockUser,
  deleteUser,
  getAdminLogs,
};
