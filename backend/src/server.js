'use strict';

const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { buildIpRateLimiter, hashIp, clientIp } = require('./rateLimiter');

const app = express();

const PORT = parseInt(process.env.PORT || '3010', 10);
const REDIS_URL = process.env.REDIS_URL || null;
const PROMPT_TTL_DAYS = parseInt(process.env.PROMPT_TTL_DAYS || '30', 10);
const DECAY_HALF_LIFE_HOURS = parseInt(process.env.DECAY_HALF_LIFE_HOURS || '72', 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS || '';
const SUBMIT_RATE_LIMIT_PER_MIN = parseInt(process.env.SUBMIT_RATE_LIMIT_PER_MIN || '15', 10);
const VOTE_RATE_LIMIT_PER_MIN = parseInt(process.env.VOTE_RATE_LIMIT_PER_MIN || '40', 10);

const allowedOrigins = new Set([
  FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

for (const origin of FRONTEND_ORIGINS.split(',')) {
  const normalized = origin.trim();
  if (normalized) allowedOrigins.add(normalized);
}

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (no Origin header) and explicitly listed browser origins.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
}));
app.use(bodyParser.json({ limit: '1mb' }));

let redis = null;
if (REDIS_URL) {
  redis = new Redis(REDIS_URL, { lazyConnect: false, enableOfflineQueue: true });
  redis.on('error', (err) => {
    console.error('[gopromptup] Redis error:', err && err.message ? err.message : err);
  });
  redis.on('connect', () => {
    console.log('[gopromptup] Redis connected');
  });
} else {
  console.warn('[gopromptup] REDIS_URL not set, using in-memory storage');
}

const memory = {
  prompts: new Map(),
  votes: new Map(),
  limiter: new Map(),
};

function nowMs() {
  return Date.now();
}

function normalizeModel(model) {
  return String(model || '').trim().toLowerCase();
}

function isReasonableModelId(model) {
  if (!model || model.length < 3 || model.length > 120) return false;
  if (!/^[a-z0-9]+([a-z0-9._:/-]*[a-z0-9])?$/.test(model)) return false;
  if (!/[a-z]/.test(model)) return false;
  return true;
}

function safeTitle(raw) {
  const title = String(raw || '').trim();
  return title.length > 140 ? title.slice(0, 140) : title;
}

function safeBody(raw) {
  const body = String(raw || '').trim();
  return body.length > 4000 ? body.slice(0, 4000) : body;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex').slice(0, 32);
}

function utcDayBucket(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function expiresAtFrom(ts) {
  return ts + PROMPT_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function decayMultiplier(ageMs) {
  const halfLifeMs = DECAY_HALF_LIFE_HOURS * 60 * 60 * 1000;
  if (halfLifeMs <= 0) return 1;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

function computedScore(prompt, ts) {
  const ageMs = Math.max(0, ts - prompt.createdAt);
  const raw = prompt.votesUp - prompt.votesDown;
  return raw * decayMultiplier(ageMs);
}

function requiredToken(req, res) {
  const token = req.header('x-epheme-token');
  if (!token || token.trim().length < 16) {
    res.status(401).json({ error: 'Missing or invalid x-epheme-token header' });
    return null;
  }
  return token.trim();
}

async function redisGetPrompt(promptId) {
  const raw = await redis.get(`gopromptup:prompt:${promptId}`);
  return raw ? JSON.parse(raw) : null;
}

async function redisSetPrompt(prompt) {
  await redis.set(`gopromptup:prompt:${prompt.id}`, JSON.stringify(prompt));
  await redis.sadd(`gopromptup:model:${prompt.model}`, prompt.id);
  if (prompt.isCustomModel) {
    await redis.sadd('gopromptup:custom-prompts', prompt.id);
  }
}

async function redisGetPromptIdsByModel(model) {
  if (model === 'other') return redis.smembers('gopromptup:custom-prompts');
  return redis.smembers(`gopromptup:model:${model}`);
}

async function redisGetVote(voteKey) {
  return redis.get(`gopromptup:vote:${voteKey}`);
}

async function redisSetVote(voteKey, value) {
  await redis.set(`gopromptup:vote:${voteKey}`, value);
}

function makeInMemoryLimiter(limit, windowMs) {
  return function inMemoryLimiter(req, res, next) {
    const ip = hashIp(clientIp(req));
    const bucket = Math.floor(nowMs() / windowMs);
    const key = `${req.path}:${ip}:${bucket}`;
    const count = (memory.limiter.get(key) || 0) + 1;
    memory.limiter.set(key, count);
    if (count > limit) {
      return res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' });
    }
    next();
  };
}

const submitLimiter = redis
  ? buildIpRateLimiter(redis, 'gopromptup_submit', 60, SUBMIT_RATE_LIMIT_PER_MIN)
  : makeInMemoryLimiter(SUBMIT_RATE_LIMIT_PER_MIN, 60 * 1000);

const voteLimiter = redis
  ? buildIpRateLimiter(redis, 'gopromptup_vote', 60, VOTE_RATE_LIMIT_PER_MIN)
  : makeInMemoryLimiter(VOTE_RATE_LIMIT_PER_MIN, 60 * 1000);

app.get('/api/healthz', (req, res) => {
  res.json({ ok: true, service: 'gopromptup-backend' });
});

app.post('/api/prompts', submitLimiter, async (req, res) => {
  const token = requiredToken(req, res);
  if (!token) return;

  const model = normalizeModel(req.body && req.body.model);
  const title = safeTitle(req.body && req.body.title);
  const body = safeBody(req.body && req.body.body);
  const isCustomModel = req.body && req.body.isCustom === true;

  if (!model) return res.status(400).json({ error: 'model is required' });
  if (model === 'other') return res.status(400).json({ error: 'Specify a concrete model name when using Other' });
  if (!isReasonableModelId(model)) return res.status(400).json({ error: 'model format is invalid' });
  if (!body) return res.status(400).json({ error: 'body is required' });

  const ts = nowMs();
  const prompt = {
    id: uuidv4(),
    model,
    title,
    body,
    isCustomModel: isCustomModel || false,
    createdAt: ts,
    updatedAt: ts,
    expiresAt: expiresAtFrom(ts),
    votesUp: 0,
    votesDown: 0,
    vibes: { clever: 0, useful: 0, funny: 0 },
    submitterTokenHash: tokenHash(token),
    lastSubmitIpHash: hashIp(clientIp(req)),
  };

  try {
    if (redis) {
      await redisSetPrompt(prompt);
    } else {
      memory.prompts.set(prompt.id, prompt);
    }
    return res.status(201).json({ prompt });
  } catch (err) {
    console.error('[gopromptup] submit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/prompts/:id/vote', voteLimiter, async (req, res) => {
  const token = requiredToken(req, res);
  if (!token) return;

  const direction = Number(req.body && req.body.direction);
  if (direction !== 1 && direction !== -1) {
    return res.status(400).json({ error: 'direction must be 1 or -1' });
  }

  const promptId = req.params.id;
  const tokenH = tokenHash(token);
  const day = utcDayBucket(nowMs());
  const voteKey = `${promptId}:${tokenH}:${day}`;

  try {
    const prompt = redis ? await redisGetPrompt(promptId) : memory.prompts.get(promptId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    if (nowMs() > prompt.expiresAt) return res.status(410).json({ error: 'Prompt expired' });

    const prevDirectionRaw = redis ? await redisGetVote(voteKey) : memory.votes.get(voteKey);
    const prevDirection = prevDirectionRaw ? Number(prevDirectionRaw) : 0;

    if (prevDirection === direction) {
      return res.json({ ok: true, changed: false, prompt });
    }

    if (prevDirection === 1) prompt.votesUp -= 1;
    if (prevDirection === -1) prompt.votesDown -= 1;

    if (direction === 1) prompt.votesUp += 1;
    if (direction === -1) prompt.votesDown += 1;

    prompt.updatedAt = nowMs();
    prompt.expiresAt = expiresAtFrom(nowMs());
    prompt.lastVoteIpHash = hashIp(clientIp(req));

    if (redis) {
      await redisSetVote(voteKey, String(direction));
      await redisSetPrompt(prompt);
    } else {
      memory.votes.set(voteKey, String(direction));
      memory.prompts.set(prompt.id, prompt);
    }

    return res.json({ ok: true, changed: true, prompt });
  } catch (err) {
    console.error('[gopromptup] vote error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/prompts', async (req, res) => {
  const model = normalizeModel(req.query.model);
  const window = String(req.query.window || 'alltime').toLowerCase();
  const sort = String(req.query.sort || 'top').toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30', 10)));

  if (!model) return res.status(400).json({ error: 'model query parameter is required' });
  if (model !== 'other' && !isReasonableModelId(model)) return res.status(400).json({ error: 'model query format is invalid' });

  try {
    const ts = nowMs();
    const ids = redis
      ? await redisGetPromptIdsByModel(model)
      : Array.from(memory.prompts.values())
          .filter((p) => model === 'other' ? p.isCustomModel : p.model === model)
          .map((p) => p.id);
    const prompts = [];

    for (const id of ids) {
      const prompt = redis ? await redisGetPrompt(id) : memory.prompts.get(id);
      if (!prompt) continue;
      if (ts > prompt.expiresAt) continue;

      if (window === 'today') {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        if (prompt.createdAt < start.getTime()) continue;
      }
      if (window === 'week') {
        const start = ts - 7 * 24 * 60 * 60 * 1000;
        if (prompt.createdAt < start) continue;
      }

      prompts.push({
        ...prompt,
        scoreRaw: prompt.votesUp - prompt.votesDown,
        score: Number(computedScore(prompt, ts).toFixed(4)),
      });
    }

    if (sort === 'new') {
      prompts.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      prompts.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.createdAt - a.createdAt;
      });
    }

    return res.json({ items: prompts.slice(0, limit), meta: { model, window, sort, limit } });
  } catch (err) {
    console.error('[gopromptup] list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/models/summary
// Returns { [modelId]: { count: N, topTitle: string|null, topScore: number } }
// for all known catalog models + any custom models that exist.
const CATALOG_MODEL_IDS = [
  'gpt-4.1','gpt-4o','gpt-4o-mini','o3','o4-mini',
  'claude-3.7-sonnet','claude-3.5-sonnet','claude-3.5-haiku',
  'gemini-2.5-pro','gemini-2.5-flash','gemini-2.0-flash',
  'llama-3.3-70b','llama-3.1-405b','llama-3.1-70b',
  'grok-3','grok-3-mini',
  'mistral-large','mistral-medium','codestral',
  'deepseek-r1','deepseek-v3',
  'qwen2.5-max','qwen2.5-72b-instruct',
  'command-r-plus','command-r',
  'phi-4','phi-3-medium',
];

// POST /api/prompts/:id/vibe
// Toggles a vibe tag (clever | useful | funny) on a prompt. Per-token, per-day.
// Does NOT affect the ranking score — purely expressive.
const VALID_TAGS = new Set(['clever', 'useful', 'funny']);

app.post('/api/prompts/:id/vibe', voteLimiter, async (req, res) => {
  const token = requiredToken(req, res);
  if (!token) return;

  const tag = String((req.body && req.body.tag) || '').toLowerCase();
  if (!VALID_TAGS.has(tag)) {
    return res.status(400).json({ error: 'tag must be clever, useful, or funny' });
  }

  const promptId = req.params.id;
  const tokenH = tokenHash(token);
  const day = utcDayBucket(nowMs());
  const vibeKey = `vibe:${promptId}:${tag}:${tokenH}:${day}`;

  try {
    const prompt = redis ? await redisGetPrompt(promptId) : memory.prompts.get(promptId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    if (nowMs() > prompt.expiresAt) return res.status(410).json({ error: 'Prompt expired' });

    if (!prompt.vibes) prompt.vibes = { clever: 0, useful: 0, funny: 0 };

    const prevRaw = redis ? await redisGetVote(vibeKey) : memory.votes.get(vibeKey);
    const isOn = prevRaw === '1';

    if (isOn) {
      prompt.vibes[tag] = Math.max(0, (prompt.vibes[tag] || 0) - 1);
      if (redis) await redisSetVote(vibeKey, '0');
      else memory.votes.set(vibeKey, '0');
    } else {
      prompt.vibes[tag] = (prompt.vibes[tag] || 0) + 1;
      if (redis) await redisSetVote(vibeKey, '1');
      else memory.votes.set(vibeKey, '1');
    }

    prompt.updatedAt = nowMs();
    if (redis) await redisSetPrompt(prompt);
    else memory.prompts.set(prompt.id, prompt);

    return res.json({ ok: true, active: !isOn, prompt });
  } catch (err) {
    console.error('[gopromptup] vibe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/models/summary', async (req, res) => {
  try {
    const ts = nowMs();
    const result = {};

    const processIds = async (modelKey, ids) => {
      let count = 0;
      let topTitle = null;
      let topScore = -Infinity;

      for (const id of ids) {
        const prompt = redis ? await redisGetPrompt(id) : memory.prompts.get(id);
        if (!prompt || ts > prompt.expiresAt) continue;
        count++;
        const score = computedScore(prompt, ts);
        if (score > topScore) {
          topScore = score;
          topTitle = prompt.title || null;
        }
      }

      result[modelKey] = { count, topTitle, topScore: count ? Number(topScore.toFixed(4)) : 0 };
    };

    if (redis) {
      // Fetch all catalog models in parallel
      await Promise.all(CATALOG_MODEL_IDS.map(async (modelId) => {
        const ids = await redisGetPromptIdsByModel(modelId);
        await processIds(modelId, ids);
      }));
      // Also fetch custom/other
      const customIds = await redis.smembers('gopromptup:custom-prompts');
      await processIds('other', customIds);
    } else {
      // In-memory: group by model
      const byModel = new Map();
      for (const prompt of memory.prompts.values()) {
        const key = prompt.isCustomModel ? 'other' : prompt.model;
        if (!byModel.has(key)) byModel.set(key, []);
        byModel.get(key).push(prompt.id);
      }
      for (const [modelKey, ids] of byModel.entries()) {
        await processIds(modelKey, ids);
      }
      // Ensure all catalog models are present
      for (const modelId of CATALOG_MODEL_IDS) {
        if (!result[modelId]) result[modelId] = { count: 0, topTitle: null, topScore: 0 };
      }
    }

    return res.json({ summary: result, generatedAt: ts });
  } catch (err) {
    console.error('[gopromptup] models/summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Activity feed: all models, newest first ─────────────────────────────────
app.get('/api/feed', async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '30', 10)));
  try {
    const ts = nowMs();
    const prompts = [];

    if (redis) {
      const allIds = [...CATALOG_MODEL_IDS];
      // Collect from all catalog models + custom in parallel
      const buckets = await Promise.all([
        ...allIds.map((modelId) => redisGetPromptIdsByModel(modelId)),
        redis.smembers('gopromptup:custom-prompts'),
      ]);
      const flatIds = buckets.flat();
      // Fetch in parallel, deduplicate by id
      const seen = new Set();
      const raw = await Promise.all(flatIds.map((id) => redisGetPrompt(id)));
      for (const prompt of raw) {
        if (!prompt || ts > prompt.expiresAt || seen.has(prompt.id)) continue;
        seen.add(prompt.id);
        prompts.push({ ...prompt, scoreRaw: prompt.votesUp - prompt.votesDown });
      }
    } else {
      for (const prompt of memory.prompts.values()) {
        if (ts > prompt.expiresAt) continue;
        prompts.push({ ...prompt, scoreRaw: prompt.votesUp - prompt.votesDown });
      }
    }

    prompts.sort((a, b) => b.createdAt - a.createdAt);
    return res.json({ items: prompts.slice(0, limit), generatedAt: ts });
  } catch (err) {
    console.error('[gopromptup] feed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`[gopromptup] backend listening on ${PORT}`);
});
