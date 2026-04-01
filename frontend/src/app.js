'use strict';

const API_BASE = '/api';
const TOKEN_KEY = 'gopromptup_token_v1';

const MODEL_CATALOG = [
  { id: 'gpt-4.1', label: 'GPT-4.1', group: 'OpenAI' },
  { id: 'gpt-4o', label: 'GPT-4o', group: 'OpenAI' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', group: 'OpenAI' },
  { id: 'o3', label: 'o3', group: 'OpenAI' },
  { id: 'o4-mini', label: 'o4-mini', group: 'OpenAI' },
  { id: 'claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', group: 'Anthropic' },
  { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', group: 'Anthropic' },
  { id: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', group: 'Anthropic' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', group: 'Google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', group: 'Google' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', group: 'Google' },
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', group: 'Meta' },
  { id: 'llama-3.1-405b', label: 'Llama 3.1 405B', group: 'Meta' },
  { id: 'llama-3.1-70b', label: 'Llama 3.1 70B', group: 'Meta' },
  { id: 'grok-3', label: 'Grok 3', group: 'xAI' },
  { id: 'grok-3-mini', label: 'Grok 3 Mini', group: 'xAI' },
  { id: 'mistral-large', label: 'Mistral Large', group: 'Mistral' },
  { id: 'mistral-medium', label: 'Mistral Medium', group: 'Mistral' },
  { id: 'codestral', label: 'Codestral', group: 'Mistral' },
  { id: 'deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek' },
  { id: 'deepseek-v3', label: 'DeepSeek V3', group: 'DeepSeek' },
  { id: 'qwen2.5-max', label: 'Qwen 2.5 Max', group: 'Qwen' },
  { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B', group: 'Qwen' },
  { id: 'command-r-plus', label: 'Command R+', group: 'Cohere' },
  { id: 'command-r', label: 'Command R', group: 'Cohere' },
  { id: 'phi-4', label: 'Phi-4', group: 'Microsoft' },
  { id: 'phi-3-medium', label: 'Phi-3 Medium', group: 'Microsoft' },
  { id: 'other', label: 'Other', group: 'Other' },
];

// Map for full labels (used on submit form etc.)
const FULL_LABEL = {
  'gpt-4.1': 'OpenAI GPT-4.1', 'gpt-4o': 'OpenAI GPT-4o', 'gpt-4o-mini': 'OpenAI GPT-4o Mini',
  'o3': 'OpenAI o3', 'o4-mini': 'OpenAI o4-mini',
  'claude-3.7-sonnet': 'Anthropic Claude 3.7 Sonnet', 'claude-3.5-sonnet': 'Anthropic Claude 3.5 Sonnet',
  'claude-3.5-haiku': 'Anthropic Claude 3.5 Haiku',
  'gemini-2.5-pro': 'Google Gemini 2.5 Pro', 'gemini-2.5-flash': 'Google Gemini 2.5 Flash',
  'gemini-2.0-flash': 'Google Gemini 2.0 Flash',
  'llama-3.3-70b': 'Meta Llama 3.3 70B', 'llama-3.1-405b': 'Meta Llama 3.1 405B',
  'llama-3.1-70b': 'Meta Llama 3.1 70B',
  'grok-3': 'xAI Grok 3', 'grok-3-mini': 'xAI Grok 3 Mini',
  'mistral-large': 'Mistral Large', 'mistral-medium': 'Mistral Medium', 'codestral': 'Mistral Codestral',
  'deepseek-r1': 'DeepSeek R1', 'deepseek-v3': 'DeepSeek V3',
  'qwen2.5-max': 'Qwen 2.5 Max', 'qwen2.5-72b-instruct': 'Qwen 2.5 72B Instruct',
  'command-r-plus': 'Cohere Command R+', 'command-r': 'Cohere Command R',
  'phi-4': 'Microsoft Phi-4', 'phi-3-medium': 'Microsoft Phi-3 Medium',
};

const GROUPS = [...new Set(MODEL_CATALOG.map((m) => m.group))];
const GROUP_DOT = {
  OpenAI: '#10a37f', Anthropic: '#d97706', Google: '#4285f4', Meta: '#0064e0',
  xAI: '#111111', Mistral: '#05c', DeepSeek: '#6366f1', Qwen: '#f59e0b',
  Cohere: '#e11d48', Microsoft: '#00a4ef', Other: '#888888',
};

// â”€â”€ DOM refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const groupTabs    = document.getElementById('groupTabs');
const modelShelf   = document.getElementById('modelShelf');
const feedHeader   = document.getElementById('feedHeader');
const feedTitle    = document.getElementById('feedTitle');
const promptSection = document.getElementById('promptSection');
const promptList   = document.getElementById('promptList');
const promptTemplate = document.getElementById('promptTemplate');
const windowSelect = document.getElementById('windowSelect');
const sortSelect   = document.getElementById('sortSelect');
const refreshBtn   = document.getElementById('refreshBtn');
const submitBtn    = document.getElementById('submitBtn');
const titleInput   = document.getElementById('titleInput');
const bodyInput    = document.getElementById('bodyInput');
const submitModelInput = document.getElementById('submitModelInput');
const activityList        = document.getElementById('activityList');
const activityNewPill     = document.getElementById('activityNewPill');
const activityRefreshBtn  = document.getElementById('activityRefreshBtn');
const tabBrowse           = document.getElementById('tabBrowse');
const tabLatest           = document.getElementById('tabLatest');
const tabShare            = document.getElementById('tabShare');
const panelBrowse         = document.getElementById('panelBrowse');
const panelLatest         = document.getElementById('panelLatest');
const panelShare          = document.getElementById('panelShare');
const latestBadge         = document.getElementById('latestBadge');

// ── Main tab switching ───────────────────────────────────────────────────────
function switchTab(tab) {
  tabBrowse.classList.toggle('active', tab === 'browse');
  tabBrowse.setAttribute('aria-selected', tab === 'browse' ? 'true' : 'false');
  panelBrowse.classList.toggle('hidden', tab !== 'browse');
  tabLatest.classList.toggle('active', tab === 'latest');
  tabLatest.setAttribute('aria-selected', tab === 'latest' ? 'true' : 'false');
  panelLatest.classList.toggle('hidden', tab !== 'latest');
  tabShare.classList.toggle('active', tab === 'share');
  tabShare.setAttribute('aria-selected', tab === 'share' ? 'true' : 'false');
  panelShare.classList.toggle('hidden', tab !== 'share');
  if (tab === 'latest') {
    // Clear badge when opening Latest
    latestBadge.textContent = '';
    latestBadge.classList.add('hidden');
  }
}

tabBrowse.addEventListener('click', () => switchTab('browse'));
tabLatest.addEventListener('click', () => switchTab('latest'));
tabShare.addEventListener('click', () => switchTab('share'));

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let activeGroup = GROUPS[0];
let activeModelId = null;
let summary = {}; // { [modelId]: { count, topTitle, topScore } }
let feedLastGeneratedAt = 0;  // timestamp of last activity feed load
let feedPendingItems = [];     // items waiting behind the "N new" pill
let feedPollTimer = null;

// â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getToken() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing && existing.length > 16) return existing;
  const fresh = `${crypto.randomUUID()}-${Date.now()}`;
  localStorage.setItem(TOKEN_KEY, fresh);
  return fresh;
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-epheme-token': token,
      ...(options.headers || {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
  return payload;
}

function modelLabel(modelId) {
  return FULL_LABEL[modelId] || MODEL_CATALOG.find((m) => m.id === modelId)?.label || modelId;
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatTime(ts) {
  return timeAgo(ts);
}

function scoreClass(n) {
  if (n >= 10) return 'score-high';
  if (n > 0)   return 'score-pos';
  if (n === 0) return 'score-zero';
  return 'score-neg';
}

function animateVote(btn) {
  btn.classList.remove('vote-pop');
  void btn.offsetWidth;
  btn.classList.add('vote-pop');
  btn.addEventListener('animationend', () => btn.classList.remove('vote-pop'), { once: true });
}

function flashCopy(btn) {
  const original = btn.textContent;
  btn.textContent = 'Copied ✓';
  btn.classList.add('copy-done');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copy-done');
  }, 1500);
}

function normalizeCustomModelName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/-{2,}/g, '-');
}

// â”€â”€ Summary loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSummary() {
  try {
    const data = await api('/models/summary');
    summary = data.summary || {};
  } catch {
    summary = {};
  }
  renderGroupTabs();
  renderModelShelf();
}

// ── Activity feed ────────────────────────────────────────────────────────────
function groupForModel(modelId) {
  return MODEL_CATALOG.find((m) => m.id === modelId)?.group || 'Other';
}

function renderActivityItems(items) {
  activityList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'card empty-state';
    empty.textContent = 'Nothing here yet — be the first to share one ↓';
    activityList.appendChild(empty);
    return;
  }
  for (const item of items) {
    const node = promptTemplate.content.cloneNode(true);
    const li = node.querySelector('li');
    if (li) {
      li.dataset.promptId = item.id;
      const group = groupForModel(item.model);
      li.style.setProperty('--model-color', GROUP_DOT[group] || '#888');
      li.classList.add('has-model-color');
    }
    node.querySelector('.prompt-title').textContent = item.title || `${modelLabel(item.model)} prompt`;
    node.querySelector('.meta').textContent = `${modelLabel(item.model)} \u00B7 ${formatTime(item.createdAt)}`;
    const scoreElA = node.querySelector('.score');
    scoreElA.textContent = `${item.scoreRaw >= 0 ? '+' : ''}${item.scoreRaw}`;
    scoreElA.className = 'score ' + scoreClass(item.scoreRaw);
    node.querySelector('.prompt-body').textContent = item.body;
    const voteUpA = node.querySelector('.vote-up');
    const voteDownA = node.querySelector('.vote-down');
    voteUpA.addEventListener('click', () => { animateVote(voteUpA); castVote(item.id, 1, true); });
    voteDownA.addEventListener('click', () => { animateVote(voteDownA); castVote(item.id, -1, true); });
    node.querySelector('.copy').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(item.body);
      flashCopy(e.currentTarget);
    });
    node.querySelector('.share').addEventListener('click', () => sharePrompt(item));
    const vibes = item.vibes || { clever: 0, useful: 0, funny: 0 };
    for (const btn of node.querySelectorAll('.vibe-btn')) {
      const tag = btn.dataset.tag;
      btn.querySelector('.vibe-count').textContent = vibes[tag] > 0 ? vibes[tag] : '';
      btn.addEventListener('click', () => castVibe(item.id, tag, btn));
    }
    activityList.appendChild(node);
  }
}

async function loadActivityFeed({ silent = false } = {}) {
  if (!silent) activityRefreshBtn.disabled = true;
  try {
    const payload = await api('/feed?limit=30');
    const generatedAt = payload.generatedAt || Date.now();
    const items = payload.items || [];

    if (feedLastGeneratedAt === 0) {
      // First load — render immediately
      renderActivityItems(items);
      feedLastGeneratedAt = generatedAt;
    } else {
      const newItems = items.filter((i) => i.createdAt > feedLastGeneratedAt);
      if (newItems.length > 0 && silent) {
        // Show the pill instead of re-rendering behind the user
        feedPendingItems = items;
        activityNewPill.textContent = `+${newItems.length} new`;
        activityNewPill.classList.remove('hidden');
        // Also badge the Latest tab if it's not active
        if (!tabLatest.classList.contains('active')) {
          latestBadge.textContent = newItems.length;
          latestBadge.classList.remove('hidden');
        }
      } else {
        renderActivityItems(items);
        feedLastGeneratedAt = generatedAt;
        activityNewPill.classList.add('hidden');
        feedPendingItems = [];
      }
    }
  } catch {
    // silent fail on poll
  } finally {
    activityRefreshBtn.disabled = false;
  }
}

function startActivityPoll() {
  clearInterval(feedPollTimer);
  feedPollTimer = setInterval(() => loadActivityFeed({ silent: true }), 30_000);
}

activityRefreshBtn.addEventListener('click', () => {
  activityRefreshBtn.classList.add('spinning');
  loadActivityFeed().finally(() => activityRefreshBtn.classList.remove('spinning'));
});
activityNewPill.addEventListener('click', () => {
  renderActivityItems(feedPendingItems);
  feedLastGeneratedAt = Date.now();
  feedPendingItems = [];
  activityNewPill.classList.add('hidden');
  latestBadge.textContent = '';
  latestBadge.classList.add('hidden');
  activityList.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// â”€â”€ Group tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderGroupTabs() {
  groupTabs.innerHTML = '';
  for (const group of GROUPS) {
    const models = MODEL_CATALOG.filter((m) => m.group === group);
    const totalCount = models.reduce((sum, m) => sum + (summary[m.id]?.count || 0), 0);

    const btn = document.createElement('button');
    btn.className = 'group-tab' + (group === activeGroup ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', group === activeGroup ? 'true' : 'false');
    btn.innerHTML = `
      <span class="group-dot" style="background:${GROUP_DOT[group] || '#888'}"></span>
      <span class="group-name">${group}</span>
      ${totalCount > 0 ? `<span class="group-badge">${totalCount}</span>` : ''}
    `;
    btn.addEventListener('click', () => {
      activeGroup = group;
      renderGroupTabs();
      renderModelShelf();
    });
    groupTabs.appendChild(btn);
  }
}

// â”€â”€ Model shelf â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderModelShelf() {
  modelShelf.innerHTML = '';
  const models = MODEL_CATALOG.filter((m) => m.group === activeGroup);

  const counts = models.map((m) => summary[m.id]?.count || 0).filter((c) => c > 0).sort((a, b) => b - a);
  const hotCutoff = counts.length > 0 ? counts[Math.max(0, Math.ceil(counts.length * 0.25) - 1)] : Infinity;

  for (const model of models) {
    const info = summary[model.id] || { count: 0, topTitle: null, topScore: 0 };
    const hasPrompts = info.count > 0;
    const isHot = hasPrompts && info.count >= hotCutoff;

    const card = document.createElement('div');
    card.className = 'model-card' +
      (activeModelId === model.id ? ' active' : '') +
      (hasPrompts ? ' has-prompts' : ' empty');
    if (isHot) card.dataset.hot = 'true';
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', activeModelId === model.id ? 'true' : 'false');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="model-card-name">${model.label}</div>
      <div class="model-card-count">${hasPrompts ? info.count + (info.count === 1 ? ' prompt' : ' prompts') : 'no prompts yet'}</div>
      ${info.topTitle ? '<div class="model-card-top"></div>' : ''}
    `;
    if (info.topTitle) {
      const topEl = card.querySelector('.model-card-top');
      topEl.textContent = '\u201c' + info.topTitle + '\u201d';
    }

    card.addEventListener('click', () => selectModel(model.id, model.label));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectModel(model.id, model.label); }
    });

    modelShelf.appendChild(card);
  }
}

// â”€â”€ Model selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function selectModel(modelId, label) {
  activeModelId = modelId;

  // Update shelf highlight
  for (const card of modelShelf.querySelectorAll('.model-card')) {
    const isActive = card.querySelector('.model-card-name')?.textContent === label;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }

  // Show feed area
  feedTitle.textContent = modelLabel(modelId);
  feedHeader.classList.remove('hidden');
  promptSection.classList.remove('hidden');

  // Pre-fill submit form model — leave editable for "Other"
  if (modelId === 'other') {
    submitModelInput.value = '';
    submitModelInput.disabled = false;
    submitModelInput.placeholder = 'e.g. Llama 4 Scout, Grok 3.5 Mini…';
    switchTab('share');
    submitModelInput.focus();
  } else {
    submitModelInput.value = modelLabel(modelId);
    submitModelInput.disabled = true;
  }

  loadPrompts();
}

// â”€â”€ Prompt list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPrompts(items) {
  promptList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'card empty-state';
    empty.textContent = 'No prompts here yet — be the first to share one ↓';
    promptList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const node = promptTemplate.content.cloneNode(true);
    // stamp id so deep-link scroll can find this card
    const li = node.querySelector('li');
    if (li) li.dataset.promptId = item.id;
    node.querySelector('.prompt-title').textContent = item.title || `${modelLabel(item.model)} prompt`;
    node.querySelector('.meta').textContent = `${modelLabel(item.model)} \u00B7 ${formatTime(item.createdAt)}`;
    const scoreEl = node.querySelector('.score');
    scoreEl.textContent = `${item.scoreRaw >= 0 ? '+' : ''}${item.scoreRaw}`;
    scoreEl.className = 'score ' + scoreClass(item.scoreRaw);
    node.querySelector('.prompt-body').textContent = item.body;

    const voteUp = node.querySelector('.vote-up');
    const voteDown = node.querySelector('.vote-down');
    voteUp.addEventListener('click', () => { animateVote(voteUp); castVote(item.id, 1); });
    voteDown.addEventListener('click', () => { animateVote(voteDown); castVote(item.id, -1); });
    node.querySelector('.copy').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(item.body);
      flashCopy(e.currentTarget);
    });
    node.querySelector('.share').addEventListener('click', () => sharePrompt(item));

    const vibes = item.vibes || { clever: 0, useful: 0, funny: 0 };
    for (const btn of node.querySelectorAll('.vibe-btn')) {
      const tag = btn.dataset.tag;
      const count = vibes[tag] || 0;
      btn.querySelector('.vibe-count').textContent = count > 0 ? count : '';
      btn.addEventListener('click', () => castVibe(item.id, tag, btn));
    }

    promptList.appendChild(node);
  }
}

async function loadPrompts() {
  if (!activeModelId) return;
  refreshBtn.disabled = true;
  try {
    const model = encodeURIComponent(activeModelId);
    const win = encodeURIComponent(windowSelect.value);
    const sort = encodeURIComponent(sortSelect.value);
    const payload = await api(`/prompts?model=${model}&window=${win}&sort=${sort}&limit=50`);
    renderPrompts(payload.items || []);
  } catch (err) {
    showToast('Couldn\'t load prompts');
  } finally {
    refreshBtn.disabled = false;
  }
}

async function castVote(promptId, direction, fromFeed = false) {
  try {
    await api(`/prompts/${promptId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    if (fromFeed) {
      await loadActivityFeed();
    } else {
      await loadPrompts();
    }
  } catch (err) {
    showToast('Vote didn\'t go through');
  }
}

function buildShareUrl(item) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?model=${encodeURIComponent(item.model)}&p=${encodeURIComponent(item.id)}`;
}

async function sharePrompt(item) {
  const url = buildShareUrl(item);
  const title = item.title || `${modelLabel(item.model)} prompt`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled — do nothing
    }
  }
  // Fallback: copy link to clipboard
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    prompt('Copy this link:', url);
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

async function castVibe(promptId, tag, btn) {
  try {
    const res = await api(`/prompts/${promptId}/vibe`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    });
    // Optimistic UI: toggle active state and update count
    const vibes = res.prompt.vibes || { clever: 0, useful: 0, funny: 0 };
    btn.classList.toggle('active', res.active);
    const countEl = btn.querySelector('.vibe-count');
    if (countEl) countEl.textContent = vibes[tag] > 0 ? vibes[tag] : '';
    // Also update sibling buttons in the same card (counts may have changed)
    const card = btn.closest('.prompt');
    if (card) {
      for (const b of card.querySelectorAll('.vibe-btn')) {
        const t = b.dataset.tag;
        const c = vibes[t] || 0;
        const ce = b.querySelector('.vibe-count');
        if (ce) ce.textContent = c > 0 ? c : '';
      }
    }
  } catch (err) {
    showToast('Vibe didn\'t register');
  }
}

// â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function submitPrompt() {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  try {
    const rawModel = submitModelInput.value.trim();
    if (!rawModel) { submitModelInput.focus(); return; }

    // Determine if it's a catalog model or custom
    const catalogEntry = MODEL_CATALOG.find(
      (m) => m.id === rawModel || (FULL_LABEL[m.id] && FULL_LABEL[m.id].toLowerCase() === rawModel.toLowerCase())
    );
    let modelValue, isCustom;
    if (catalogEntry && catalogEntry.id !== 'other') {
      modelValue = catalogEntry.id;
      isCustom = false;
    } else {
      modelValue = normalizeCustomModelName(rawModel);
      isCustom = true;
    }

    await api('/prompts', {
      method: 'POST',
      body: JSON.stringify({ model: modelValue, title: titleInput.value, body: bodyInput.value, isCustom }),
    });

    titleInput.value = '';
    bodyInput.value = '';
    switchTab('browse');
    showToast('Prompt submitted ✓');

    // Refresh summary counts + prompts + activity feed
    await Promise.all([loadSummary(), loadActivityFeed()]);
    if (activeModelId) await loadPrompts();
  } catch (err) {
    showToast('Couldn\'t submit — ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

// -- Wire events ----------------------------------------------------------
refreshBtn.addEventListener('click', () => {
  refreshBtn.classList.add('spinning');
  loadPrompts().finally(() => refreshBtn.classList.remove('spinning'));
});
submitBtn.addEventListener('click', submitPrompt);
windowSelect.addEventListener('change', loadPrompts);
sortSelect.addEventListener('change', loadPrompts);

// Allow typing a custom model in the submit form
submitModelInput.addEventListener('focus', () => { submitModelInput.disabled = false; });

// Handle deep-link: ?model=gpt-4o&p=<promptId>
async function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const modelParam = params.get('model');
  const promptParam = params.get('p');

  // Always boot the activity feed + summary in parallel
  await Promise.all([loadActivityFeed(), loadSummary()]);
  startActivityPoll();

  if (!modelParam) return;

  // Deep link targets a model — show Browse tab
  switchTab('browse');

  const entry = MODEL_CATALOG.find((m) => m.id === modelParam);
  if (entry) activeGroup = entry.group;
  renderGroupTabs();
  renderModelShelf();
  selectModel(modelParam, entry ? entry.label : modelParam);

  if (!promptParam) return;

  setTimeout(() => {
    for (const card of promptList.querySelectorAll('.prompt.card')) {
      if (card.dataset.promptId === promptParam) {
        card.classList.add('highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const det = card.querySelector('details');
        if (det) det.open = true;
        setTimeout(() => card.classList.remove('highlighted'), 3000);
        break;
      }
    }
  }, 700);
}

handleDeepLink();
