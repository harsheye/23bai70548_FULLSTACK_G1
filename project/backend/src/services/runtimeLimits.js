const jwt = require('jsonwebtoken');
const { ensureRedis } = require('../config/redis');

const RATE_LIMIT_WINDOW_MS = Math.max(Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 1000);
const RATE_LIMIT_MAX = Math.max(Number(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'development' ? 5000 : 2000), 100);

const encodeKeyPart = (value) => Buffer.from(String(value)).toString('base64url');

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';

const getUsageDateKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSecondsUntilNextUtcDay = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(Math.ceil((next - now.getTime()) / 1000), 1);
};

const getUserUsageKey = (userId) => `usage:user:${getUsageDateKey()}:${userId}`;
const getIpUsageKey = (ipAddress) => `usage:ip:${getUsageDateKey()}:${encodeKeyPart(ipAddress)}`;

const parseUsage = (usage = {}) => ({
  upload_bytes: Number(usage.upload_bytes || 0),
  download_bytes: Number(usage.download_bytes || 0),
});

const getUsageFromRedis = async (key) => {
  const redis = await ensureRedis();
  const usage = await redis.hGetAll(key);
  return parseUsage(usage);
};

const getUserDailyUsage = async (userId) => getUsageFromRedis(getUserUsageKey(userId));

const getIpDailyUsage = async (ipAddress) => getUsageFromRedis(getIpUsageKey(ipAddress));

const incrementUsage = async (key, field, byteCount) => {
  const redis = await ensureRedis();
  const multi = redis.multi();
  multi.hIncrBy(key, field, Number(byteCount || 0));
  multi.expire(key, getSecondsUntilNextUtcDay());
  await multi.exec();
};

const incrementUserDailyUsage = async (userId, kind, byteCount) =>
  incrementUsage(getUserUsageKey(userId), `${kind}_bytes`, byteCount);

const incrementIpDailyUsage = async (ipAddress, kind, byteCount) =>
  incrementUsage(getIpUsageKey(ipAddress), `${kind}_bytes`, byteCount);

const getRateLimitIdentity = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token && process.env.JWT_SECRET) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload?.id) {
        return `user:${payload.id}`;
      }
    } catch (error) {
      // Fall back to IP identity when token is invalid or expired.
    }
  }

  return `ip:${getClientIp(req)}`;
};

const enforceRedisRateLimit = async (req) => {
  const redis = await ensureRedis();
  const identity = getRateLimitIdentity(req);
  const rateKey = `rate:${identity}`;
  const nextCount = await redis.incr(rateKey);

  if (nextCount === 1) {
    await redis.pExpire(rateKey, RATE_LIMIT_WINDOW_MS);
  }

  const ttlMs = await redis.pTTL(rateKey);
  return {
    allowed: nextCount <= RATE_LIMIT_MAX,
    remaining: Math.max(RATE_LIMIT_MAX - nextCount, 0),
    retryAfterSeconds: ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  };
};

module.exports = {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  getClientIp,
  getUserDailyUsage,
  getIpDailyUsage,
  incrementUserDailyUsage,
  incrementIpDailyUsage,
  enforceRedisRateLimit,
};
