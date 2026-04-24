const { enforceRedisRateLimit } = require('../services/runtimeLimits');

const redisRateLimit = async (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  try {
    const limitResult = await enforceRedisRateLimit(req);
    res.setHeader('X-RateLimit-Remaining', limitResult.remaining);

    if (!limitResult.allowed) {
      res.setHeader('Retry-After', limitResult.retryAfterSeconds);
      return res.status(429).json({ message: 'Too many requests, please try again later.' });
    }

    return next();
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return next();
  }
};

module.exports = redisRateLimit;
