const API_BASE = 'http://localhost:3010/api';
const TOKEN_KEY = 'gopromptup_token_v1';

const MODEL_CATALOG = [
  { id: 'gpt-4.1', label: 'OpenAI GPT-4.1', group: 'OpenAI' },
  { id: 'gpt-4o', label: 'OpenAI GPT-4o', group: 'OpenAI' },
  { id: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini', group: 'OpenAI' },
  { id: 'o3', label: 'OpenAI o3', group: 'OpenAI' },
  { id: 'o4-mini', label: 'OpenAI o4-mini', group: 'OpenAI' },
  { id: 'claude-3.7-sonnet', label: 'Anthropic Claude 3.7 Sonnet', group: 'Anthropic' },
  { id: 'claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet', group: 'Anthropic' },
  { id: 'claude-3.5-haiku', label: 'Anthropic Claude 3.5 Haiku', group: 'Anthropic' },
  { id: 'gemini-2.5-pro', label: 'Google Gemini 2.5 Pro', group: 'Google' },
  { id: 'gemini-2.5-flash', label: 'Google Gemini 2.5 Flash', group: 'Google' },
  { id: 'gemini-2.0-flash', label: 'Google Gemini 2.0 Flash', group: 'Google' },
  { id: 'llama-3.3-70b', label: 'Meta Llama 3.3 70B', group: 'Meta' },
  { id: 'llama-3.1-405b', label: 'Meta Llama 3.1 405B', group: 'Meta' },
  { id: 'llama-3.1-70b', label: 'Meta Llama 3.1 70B', group: 'Meta' },
  { id: 'grok-3', label: 'xAI Grok 3', group: 'xAI' },
  { id: 'grok-3-mini', label: 'xAI Grok 3 Mini', group: 'xAI' },
  { id: 'mistral-large', label: 'Mistral Large', group: 'Mistral' },
  { id: 'mistral-medium', label: 'Mistral Medium', group: 'Mistral' },
  { id: 'codestral', label: 'Mistral Codestral', group: 'Mistral' },
  { id: 'deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek' },
  { id: 'deepseek-v3', label: 'DeepSeek V3', group: 'DeepSeek' },
  { id: 'qwen2.5-max', label: 'Qwen 2.5 Max', group: 'Alibaba/Qwen' },
  { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct', group: 'Alibaba/Qwen' },
  { id: 'command-r-plus', label: 'Cohere Command R+', group: 'Cohere' },
  { id: 'command-r', label: 'Cohere Command R', group: 'Cohere' },
  { id: 'phi-4', label: 'Microsoft Phi-4', group: 'Microsoft' },
  { id: 'phi-3-medium', label: 'Microsoft Phi-3 Medium', group: 'Microsoft' },
];

const MODEL_LABEL_BY_ID = MODEL_CATALOG.reduce((acc, model) => {
  acc[model.id] = model.label;
  return acc;
}, {});

const modelSelect = document.getElementById('modelSelect');
const submitModelWrap = document.getElementById('submitModelWrap');
const submitModelInput = document.getElementById('submitModelInput');
const windowSelect = document.getElementById('windowSelect');
const sortSelect = document.getElementById('sortSelect');
const refreshBtn = document.getElementById('refreshBtn');
const submitBtn = document.getElementById('submitBtn');
const titleInput = document.getElementById('titleInput');
const bodyInput = document.getElementById('bodyInput');
const promptList = document.getElementById('promptList');
const promptTemplate = document.getElementById('promptTemplate');

function populateModelSelect() {
  const grouped = new Map();
  for (const model of MODEL_CATALOG) {
    if (!grouped.has(model.group)) grouped.set(model.group, []);
    grouped.get(model.group).push(model);
  }

  modelSelect.innerHTML = '';
  for (const [group, models] of grouped.entries()) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.label;
      optgroup.appendChild(option);
    }
    modelSelect.appendChild(optgroup);
  }

  const otherOption = document.createElement('option');
  otherOption.value = 'other';
  otherOption.textContent = 'Other';
  modelSelect.appendChild(otherOption);

  modelSelect.value = 'gpt-4o';
}

function selectedModelValue() {
  // For browsing: Other → aggregate all custom-model prompts; no text input needed.
  return modelSelect.value;
}

function normalizeCustomModelName(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
}

function validateCustomModelName(value) {
  const raw = String(value || '').trim();
  if (!raw) return { ok: false, message: 'Model name is required.' };
  if (raw.length < 2 || raw.length > 120) return { ok: false, message: 'Use 2–120 characters.' };
  if (!/[a-zA-Z]/.test(raw)) return { ok: false, message: 'Include at least one letter.' };
  if (!/^[a-zA-Z0-9 .\-_/:()]+$/.test(raw)) {
    return { ok: false, message: 'Letters, digits, spaces and . - _ / : ( ) only.' };
  }
  return { ok: true, message: '' };
}

function syncCustomModelValidation() {
  if (modelSelect.value !== 'other') {
    submitModelInput.setCustomValidity('');
    return true;
  }
  const check = validateCustomModelName(submitModelInput.value);
  submitModelInput.setCustomValidity(check.ok ? '' : check.message);
  return check.ok;
}

function syncOtherModelVisibility() {
  const isOther = modelSelect.value === 'other';
  submitModelWrap.hidden = false;
  submitModelInput.required = isOther;
  if (isOther) {
    submitModelInput.disabled = false;
    submitModelInput.value = '';
  } else {
    const label = MODEL_LABEL_BY_ID[modelSelect.value] || modelSelect.value;
    submitModelInput.value = label;
    submitModelInput.disabled = true;
  }
  syncCustomModelValidation();
}

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
  if (!res.ok) {
    throw new Error(payload.error || `Request failed (${res.status})`);
  }
  return payload;
}

function modelLabel(model) {
  const m = String(model || '').toLowerCase();
  return MODEL_LABEL_BY_ID[m] || model;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

function renderPrompts(items) {
  promptList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'card';
    empty.textContent = 'No prompts yet. Add the first one.';
    promptList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const node = promptTemplate.content.cloneNode(true);
    node.querySelector('.prompt-title').textContent = item.title || `${modelLabel(item.model)} prompt`;
    node.querySelector('.meta').textContent = `${modelLabel(item.model)} | ${formatTime(item.createdAt)}`;
    node.querySelector('.score').textContent = `${item.scoreRaw} raw | ${item.score} decayed`;
    node.querySelector('.prompt-body').textContent = item.body;

    node.querySelector('.vote-up').addEventListener('click', async () => {
      await castVote(item.id, 1);
    });
    node.querySelector('.vote-down').addEventListener('click', async () => {
      await castVote(item.id, -1);
    });
    node.querySelector('.copy').addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.body);
    });

    promptList.appendChild(node);
  }
}

async function loadPrompts() {
  refreshBtn.disabled = true;
  try {
    const modelValue = selectedModelValue();
    if (!modelValue) {
      renderPrompts([]);
      return;
    }
    const model = encodeURIComponent(modelValue);
    const windowMode = encodeURIComponent(windowSelect.value);
    const sort = encodeURIComponent(sortSelect.value);
    const payload = await api(`/prompts?model=${model}&window=${windowMode}&sort=${sort}&limit=50`, {
      method: 'GET',
    });
    renderPrompts(payload.items || []);
  } catch (err) {
    alert(err.message);
  } finally {
    refreshBtn.disabled = false;
  }
}

async function castVote(promptId, direction) {
  try {
    await api(`/prompts/${promptId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    await loadPrompts();
  } catch (err) {
    alert(err.message);
  }
}

async function submitPrompt() {
  submitBtn.disabled = true;
  try {
    let modelValue;
    let isCustom = false;
    if (modelSelect.value === 'other') {
      if (!syncCustomModelValidation()) {
        submitModelInput.reportValidity();
        return;
      }
      modelValue = normalizeCustomModelName(submitModelInput.value);
      isCustom = true;
    } else {
      modelValue = modelSelect.value;
    }
    const payload = {
      model: modelValue,
      title: titleInput.value,
      body: bodyInput.value,
      isCustom,
    };
    await api('/prompts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    titleInput.value = '';
    bodyInput.value = '';
    await loadPrompts();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadPrompts);
submitBtn.addEventListener('click', submitPrompt);
windowSelect.addEventListener('change', loadPrompts);
sortSelect.addEventListener('change', loadPrompts);
modelSelect.addEventListener('change', () => {
  syncOtherModelVisibility();
  loadPrompts();
});
submitModelInput.addEventListener('input', syncCustomModelValidation);

populateModelSelect();
syncOtherModelVisibility();
loadPrompts();
