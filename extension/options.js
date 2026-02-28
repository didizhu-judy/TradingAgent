const WORK_SKINS = ['code', 'doc', 'sheet', 'slides', 'mail'];
const DEFAULT_WORK_SKIN = 'code';
const SKIN_DEFAULT_THEME = {
  code: 'dark',
  doc: 'light',
  sheet: 'light',
  slides: 'light',
  mail: 'light'
};
let currentThemePreference = '';

function normalizeWorkSkin(value) {
  const id = String(value || '').trim().toLowerCase();
  return WORK_SKINS.includes(id) ? id : DEFAULT_WORK_SKIN;
}

function normalizeSkinThemeMode(value) {
  if (value === 'light' || value === 'dark' || value === 'follow') return value;
  return 'follow';
}

function normalizeTheme(value) {
  if (value === 'dark' || value === 'light') return value;
  return '';
}

function getResolvedTheme(workSkin, skinThemeMode, explicitTheme) {
  if (skinThemeMode === 'light' || skinThemeMode === 'dark') return skinThemeMode;
  return SKIN_DEFAULT_THEME[workSkin] || normalizeTheme(explicitTheme) || 'light';
}

function applyOptionsAppearance(workSkin, skinThemeMode) {
  const skin = normalizeWorkSkin(workSkin);
  const mode = normalizeSkinThemeMode(skinThemeMode);
  const theme = getResolvedTheme(skin, mode, currentThemePreference);
  document.documentElement.setAttribute('data-work-skin', skin);
  document.documentElement.setAttribute('data-theme', theme);
}

function setSelectedWorkSkin(skin) {
  const normalized = normalizeWorkSkin(skin);
  const input = document.getElementById('workSkin');
  if (input) input.value = normalized;
  document.querySelectorAll('.work-skin-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-work-skin') === normalized);
  });
}

function updateOpacityLabel(value) {
  const el = document.getElementById('opacityValue');
  if (el) el.textContent = Math.round(parseFloat(value) * 100) + '%';
}

function saveOptions() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiSecret = document.getElementById('apiSecret').value.trim();
  const environment = document.getElementById('environment').value;
  const useProxy = document.getElementById('useProxy').checked;
  const proxyUrl = document.getElementById('proxyUrl').value.trim() || 'http://127.0.0.1:8765';
  const autoEl = document.getElementById('autoRefreshSeconds');
  const autoRefreshSeconds = autoEl ? Math.max(0, parseInt(autoEl.value, 10) || 0) : 0;
  const opacity = Math.min(1, Math.max(0, parseFloat(document.getElementById('opacity').value) ?? 1));
  const language = (document.getElementById('language') && document.getElementById('language').value) || 'zh';
  const workSkin = normalizeWorkSkin((document.getElementById('workSkin') && document.getElementById('workSkin').value) || DEFAULT_WORK_SKIN);
  const skinThemeMode = normalizeSkinThemeMode((document.getElementById('skinThemeMode') && document.getElementById('skinThemeMode').value) || 'follow');
  const openRouterApiKey = (document.getElementById('openRouterApiKey') && document.getElementById('openRouterApiKey').value) ? document.getElementById('openRouterApiKey').value.trim() : '';
  const openRouterModel = (document.getElementById('openRouterModel') && document.getElementById('openRouterModel').value) ? document.getElementById('openRouterModel').value.trim() : 'qwen/qwen3.5-plus-02-15:online';
  const serperApiKey = (document.getElementById('serperApiKey') && document.getElementById('serperApiKey').value) ? document.getElementById('serperApiKey').value.trim() : '';
  const customAnalysisApiUrl = (document.getElementById('customAnalysisApiUrl') && document.getElementById('customAnalysisApiUrl').value) ? document.getElementById('customAnalysisApiUrl').value.trim() : '';
  const miroMindUrl = (document.getElementById('miroMindUrl') && document.getElementById('miroMindUrl').value) ? document.getElementById('miroMindUrl').value.trim() : '';

  chrome.storage.local.get(['workSkin', 'skinUsageStats', 'skinSwitchCount'], function(meta) {
    const prevSkin = normalizeWorkSkin(meta.workSkin);
    const nextData = {
      apiKey,
      apiSecret,
      environment: environment === 'live' ? 'live' : 'demo',
      useProxy,
      proxyUrl: proxyUrl.replace(/\/$/, ''),
      autoRefreshSeconds,
      opacity,
      language,
      workSkin,
      skinThemeMode,
      openRouterApiKey,
      openRouterModel,
      serperApiKey,
      customAnalysisApiUrl,
      miroMindUrl: miroMindUrl || 'https://dr.miromind.ai/'
    };

    if (skinThemeMode === 'follow') {
      nextData.theme = SKIN_DEFAULT_THEME[workSkin] || 'light';
    } else {
      nextData.theme = skinThemeMode;
    }

    if (prevSkin !== workSkin) {
      const stats = (meta.skinUsageStats && typeof meta.skinUsageStats === 'object') ? { ...meta.skinUsageStats } : {};
      stats[workSkin] = (Number(stats[workSkin]) || 0) + 1;
      nextData.skinUsageStats = stats;
      nextData.skinSwitchCount = (Number(meta.skinSwitchCount) || 0) + 1;
      nextData.skinLastSwitchedAt = Date.now();
    }

    chrome.storage.local.set(nextData, function() {
      const status = document.getElementById('status');
      status.textContent = '已保存';
      setTimeout(function() { status.textContent = ''; }, 2000);
    });
  });
}

function loadOptions() {
  chrome.storage.local.get(['apiKey', 'apiSecret', 'environment', 'useProxy', 'proxyUrl', 'autoRefreshSeconds', 'opacity', 'language', 'theme', 'workSkin', 'skinThemeMode', 'openRouterApiKey', 'openRouterModel', 'serperApiKey', 'customAnalysisApiUrl', 'miroMindUrl'], function(r) {
    currentThemePreference = normalizeTheme(r.theme);
    document.getElementById('apiKey').value = r.apiKey || '';
    document.getElementById('apiSecret').value = r.apiSecret || '';
    document.getElementById('environment').value = (r.environment === 'live' ? 'live' : 'demo');
    document.getElementById('useProxy').checked = !!r.useProxy;
    document.getElementById('proxyUrl').value = r.proxyUrl || 'http://127.0.0.1:8765';

    const autoEl = document.getElementById('autoRefreshSeconds');
    if (autoEl) autoEl.value = Math.max(0, parseInt(r.autoRefreshSeconds, 10) || 0);

    const opacityEl = document.getElementById('opacity');
    const opacityVal = Math.min(1, Math.max(0, parseFloat(r.opacity) ?? 1));
    if (opacityEl) opacityEl.value = opacityVal;
    updateOpacityLabel(opacityVal);

    const langEl = document.getElementById('language');
    if (langEl) langEl.value = r.language || 'zh';

    setSelectedWorkSkin(r.workSkin || DEFAULT_WORK_SKIN);
    const skinThemeModeEl = document.getElementById('skinThemeMode');
    if (skinThemeModeEl) {
      skinThemeModeEl.value = normalizeSkinThemeMode(r.skinThemeMode);
      applyOptionsAppearance((document.getElementById('workSkin') && document.getElementById('workSkin').value) || DEFAULT_WORK_SKIN, skinThemeModeEl.value);
    }

    const openRouterEl = document.getElementById('openRouterApiKey');
    if (openRouterEl) openRouterEl.value = r.openRouterApiKey || '';

    const openRouterModelEl = document.getElementById('openRouterModel');
    if (openRouterModelEl) openRouterModelEl.value = r.openRouterModel || 'qwen/qwen3.5-plus-02-15:online';

    const serperEl = document.getElementById('serperApiKey');
    if (serperEl) serperEl.value = r.serperApiKey || '';

    const customApiEl = document.getElementById('customAnalysisApiUrl');
    if (customApiEl) customApiEl.value = r.customAnalysisApiUrl || '';

    const miroUrlEl = document.getElementById('miroMindUrl');
    if (miroUrlEl) miroUrlEl.value = r.miroMindUrl || 'https://dr.miromind.ai/';
  });
}

document.querySelectorAll('.work-skin-card').forEach(card => {
  card.addEventListener('click', function() {
    const selected = this.getAttribute('data-work-skin');
    setSelectedWorkSkin(selected);
    const skinThemeModeEl = document.getElementById('skinThemeMode');
    applyOptionsAppearance(selected, skinThemeModeEl ? skinThemeModeEl.value : 'follow');
  });
});

const skinThemeModeInput = document.getElementById('skinThemeMode');
if (skinThemeModeInput) {
  skinThemeModeInput.addEventListener('change', function() {
    const skinInput = document.getElementById('workSkin');
    applyOptionsAppearance((skinInput && skinInput.value) || DEFAULT_WORK_SKIN, this.value);
  });
}

const opacityInput = document.getElementById('opacity');
if (opacityInput) {
  opacityInput.addEventListener('input', function() {
    updateOpacityLabel(this.value);
  });
}

document.getElementById('save').addEventListener('click', saveOptions);
loadOptions();
