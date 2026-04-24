const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendRegistrationOtpEmail } = require('../services/emailService');
const { getClientIp, getUserDailyUsage, getIpDailyUsage } = require('../services/runtimeLimits');

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const DAILY_TRANSFER_LIMIT_BYTES = 500 * 1024 * 1024;
const REGISTRATION_OTP_TTL_MINUTES = 10;
const REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_REGISTRATION_OTP_ATTEMPTS = 5;

const isUserCurrentlyBlocked = (user) =>
  Boolean(
    user?.is_blocked &&
    (!user.blocked_until || new Date(user.blocked_until).getTime() > Date.now())
  );

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const generateOtpCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const getRegistrationOtpRecord = async (email) => {
  const result = await pool.query(
    `SELECT *
     FROM registration_otps
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

const getInitialRole = async () => {
  const adminCountResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = 'admin'`
  );

  return Number(adminCountResult.rows[0]?.count || 0) === 0 ? 'admin' : 'user';
};

const ensureUserDoesNotExist = async (email, username) => {
  const userExists = await pool.query(
    'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR username = $2 LIMIT 1',
    [email, username]
  );

  if (userExists.rows.length > 0) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }
};

const requestRegistrationOtp = async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);

    await ensureUserDoesNotExist(email, username);

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60 * 1000);

    await pool.query(
      `DELETE FROM registration_otps
       WHERE LOWER(email) = LOWER($1) OR username = $2`,
      [email, username]
    );

    await pool.query(
      `INSERT INTO registration_otps (
         username, email, password_hash, otp_code, attempts, expires_at, last_sent_at, updated_at
       )
       VALUES ($1, $2, $3, $4, 0, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [username, email, hashedPassword, otpCode, expiresAt]
    );

    await sendRegistrationOtpEmail({ email, username, otp: otpCode });

    res.status(200).json({
      message: 'Verification code sent successfully',
      email,
      expiresInMinutes: REGISTRATION_OTP_TTL_MINUTES,
    });
  } catch (error) {
    console.error('Request registration OTP error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to send verification code' });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    const pendingRegistration = await getRegistrationOtpRecord(email);

    if (!pendingRegistration) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    if (new Date(pendingRegistration.expires_at).getTime() < Date.now()) {
      await pool.query('DELETE FROM registration_otps WHERE id = $1', [pendingRegistration.id]);
      return res.status(410).json({ message: 'Verification code expired. Please request a new one.' });
    }

    if (Number(pendingRegistration.attempts || 0) >= MAX_REGISTRATION_OTP_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new code.' });
    }

    if (pendingRegistration.otp_code !== otp) {
      await pool.query(
        `UPDATE registration_otps
         SET attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pendingRegistration.id]
      );
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await ensureUserDoesNotExist(pendingRegistration.email, pendingRegistration.username);
    const role = await getInitialRole();
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, storage_limit_bytes, daily_transfer_limit_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role`,
      [
        pendingRegistration.username,
        pendingRegistration.email,
        pendingRegistration.password_hash,
        role,
        STORAGE_LIMIT_BYTES,
        DAILY_TRANSFER_LIMIT_BYTES,
      ]
    );

    await pool.query('DELETE FROM registration_otps WHERE id = $1', [pendingRegistration.id]);

    res.status(201).json({
      message: 'Email verified successfully. You can now log in.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Verify registration OTP error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to verify registration code' });
  }
};

const resendRegistrationOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const pendingRegistration = await getRegistrationOtpRecord(email);

    if (!pendingRegistration) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    const lastSentAt = new Date(pendingRegistration.last_sent_at).getTime();
    const secondsSinceLastSend = Math.floor((Date.now() - lastSentAt) / 1000);
    if (secondsSinceLastSend < REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS) {
      return res.status(429).json({
        message: `Please wait ${REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend}s before resending`,
      });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60 * 1000);
    await pool.query(
      `UPDATE registration_otps
       SET otp_code = $2,
           attempts = 0,
           expires_at = $3,
           last_sent_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pendingRegistration.id, otpCode, expiresAt]
    );

    await sendRegistrationOtpEmail({
      email: pendingRegistration.email,
      username: pendingRegistration.username,
      otp: otpCode,
    });

    res.json({
      message: 'Verification code resent successfully',
      email: pendingRegistration.email,
      expiresInMinutes: REGISTRATION_OTP_TTL_MINUTES,
    });
  } catch (error) {
    console.error('Resend registration OTP error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to resend verification code' });
  }
};

const login = async (req, res) => {
  try {
    const password = req.body.password;
    const email = normalizeEmail(req.body.email);

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (isUserCurrentlyBlocked(user)) {
      return res.status(403).json({
        message: user.blocked_until
          ? `Your account is blocked until ${new Date(user.blocked_until).toLocaleString()}.`
          : 'Your account has been blocked by an administrator.',
      });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT id, username, email, created_at, role, is_blocked, blocked_until, blocked_reason,
              storage_limit_bytes, daily_transfer_limit_bytes
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const storageResult = await pool.query(
      'SELECT COALESCE(SUM(file_size), 0) AS total FROM files WHERE user_id = $1',
      [req.user.id]
    );

    const userUsage = await getUserDailyUsage(req.user.id);
    const ipUsage = await getIpDailyUsage(getClientIp(req));

    res.json({
      ...profileResult.rows[0],
      storage_used_bytes: Number(storageResult.rows[0]?.total || 0),
      is_admin: profileResult.rows[0].role === 'admin',
      storage_limit_bytes: Number(profileResult.rows[0]?.storage_limit_bytes || STORAGE_LIMIT_BYTES),
      daily_upload_bytes: Number(userUsage.upload_bytes || 0),
      daily_download_bytes: Number(userUsage.download_bytes || 0),
      daily_transfer_limit_bytes: Number(profileResult.rows[0]?.daily_transfer_limit_bytes || DAILY_TRANSFER_LIMIT_BYTES),
      ip_daily_upload_bytes: Number(ipUsage.upload_bytes || 0),
      ip_daily_download_bytes: Number(ipUsage.download_bytes || 0),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  login,
  getProfile
};
