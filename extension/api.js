/**
 * Trading 212 API 调用封装
 * 优先使用本地代理（避免 CORS），否则直连（部分环境可能被 CORS 拦截）
 */

const BASE = {
  live: 'https://live.trading212.com/api/v0',
  demo: 'https://demo.trading212.com/api/v0'
};

async function getConfig() {
  const r = await chrome.storage.local.get(['apiKey', 'apiSecret', 'environment', 'useProxy', 'proxyUrl']);
  return {
    apiKey: r.apiKey || '',
    apiSecret: r.apiSecret || '',
    environment: (r.environment === 'live' ? 'live' : 'demo'),
    useProxy: !!r.useProxy,
    proxyUrl: (r.proxyUrl || 'http://127.0.0.1:8765').replace(/\/$/, '')
  };
}

function buildAuthHeader(apiKey, apiSecret) {
  const credentials = btoa(unescape(encodeURIComponent(`${apiKey}:${apiSecret}`)));
  return `Basic ${credentials}`;
}

async function request(path, config) {
  const { apiKey, apiSecret, environment, useProxy, proxyUrl } = config;
  if (!apiKey || !apiSecret) {
    throw new Error('请先在选项中配置 API Key 和 API Secret');
  }
  const base = BASE[environment];
  const url = useProxy ? `${proxyUrl}${path}` : `${base}${path}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (!useProxy) {
    headers['Authorization'] = buildAuthHeader(apiKey, apiSecret);
  }
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const text = await res.text();
    let msg = `请求失败 ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j.message) msg = j.message;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

/** 账户摘要：现金、投资总值、已实现/未实现盈亏 */
export async function getAccountSummary() {
  const config = await getConfig();
  return request('/equity/account/summary', config);
}

/** 现金余额 */
export async function getAccountCash() {
  const config = await getConfig();
  return request('/equity/account/cash', config);
}

/** 所有持仓（含当前价、成本、未实现盈亏） */
export async function getPositions() {
  const config = await getConfig();
  return request('/equity/positions', config);
}

export { getConfig };
