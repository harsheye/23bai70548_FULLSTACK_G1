const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (error) => {
  console.error('Redis client error:', error);
});

let connectPromise = null;

const ensureRedis = async () => {
  if (redisClient.isOpen) return redisClient;
  if (!connectPromise) {
    connectPromise = redisClient.connect().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }
  await connectPromise;
  return redisClient;
};

module.exports = {
  redisClient,
  ensureRedis,
};
