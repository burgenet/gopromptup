'use strict';

const crypto = require('crypto');

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 16);
}

function clientIp(req) {
  return req.ip
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
}

async function redisCount(redis, key, windowSeconds, limit) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  const ttl = await redis.ttl(key);
  return { allowed: count <= limit, count, ttl: ttl > 0 ? ttl : windowSeconds };
}

function buildIpRateLimiter(redis, keyPrefix, windowSeconds, defaultLimit) {
  return async function ipRateLimiterMiddleware(req, res, next) {
    const ip = clientIp(req);
    const hashed = hashIp(ip);
    const windowStart = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${keyPrefix}:${hashed}:${windowStart}`;

    let result;
    try {
      result = await redisCount(redis, key, windowSeconds, defaultLimit);
    } catch (err) {
      console.warn(`[rateLimiter] Redis error for key ${key}:`, err.message);
      return next();
    }

    if (!result.allowed) {
      res.set('Retry-After', String(result.ttl));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.ttl,
      });
    }
    next();
  };
}

module.exports = {
  buildIpRateLimiter,
  hashIp,
  clientIp,
};
