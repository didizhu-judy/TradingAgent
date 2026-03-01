/**
 * Trading 212 API 调用封装
 * 优先使用本地代理（避免 CORS），否则直连（部分环境可能被 CORS 拦截）
 */

const BASE = {
  live: 'https://live.trading212.com/api/v0',
  demo: 'https://demo.trading212.com/api/v0'
};
const WORK_SKIN_IDS = new Set(['code', 'doc', 'sheet', 'slides', 'mail']);
const ANALYSIS_GLOBAL_REQUIREMENT = '根据最新国际形势分析股市情况';
const SYMBOL_ALIASES = {
  FVAC: 'MP'
};
const DEFAULT_WATCHLIST_ITEMS = [
  { ticker: 'META', name: 'Meta Platforms' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'TSLA', name: 'Tesla' },
  { ticker: 'AVGO', name: 'Broadcom' },
  { ticker: 'BABA', name: 'Alibaba' },
  { ticker: 'CVX', name: 'Chevron' },
  { ticker: 'TECH100', name: 'USA Tech 100' },
  { ticker: 'USA500', name: 'USA 500' },
  { ticker: 'AMD', name: 'Advanced Micro Devices' },
  { ticker: 'NOC', name: 'Northrop Grumman' },
  { ticker: 'RTX', name: 'RTX Corp' },
  { ticker: 'LMT', name: 'Lockheed Martin' },
  { ticker: 'MU', name: 'Micron Technology' },
  { ticker: 'XAUUSD', name: 'Gold' },
  { ticker: 'GOOGL', name: 'Alphabet (Class A)' },
  { ticker: 'NVDA', name: 'Nvidia' },
  { ticker: 'AAPL', name: 'Apple' }
];
const INSTRUMENTS_CACHE_TTL_MS = 10 * 60 * 1000;
const WATCHLIST_QUOTES_REFRESH_MS = 5 * 1000;
const DEFAULT_WATCHLIST_QUOTES_CACHE_TTL_MS = WATCHLIST_QUOTES_REFRESH_MS;
const STOOQ_QUOTE_CACHE_TTL_MS = WATCHLIST_QUOTES_REFRESH_MS;
const T212_QUOTE_CACHE_TTL_MS = WATCHLIST_QUOTES_REFRESH_MS;
const T212_QUOTE_CONCURRENCY = 4;
const STOOQ_QUOTE_ENDPOINT = 'https://stooq.com/q/l/';
const STOOQ_SYMBOL_OVERRIDES = {
  TECH100: '^ndx',
  USA500: '^spx',
  XAUUSD: 'xauusd'
};
let instrumentsCache = {
  ts: 0,
  items: null
};
let defaultWatchlistQuotesCache = {
  ts: 0,
  items: null
};
let stooqQuotesCache = new Map();
let t212QuotesCache = new Map();
let t212QuotesRateLimitUntil = 0;

function normalizeWorkSkin(value) {
  const id = String(value || '').trim().toLowerCase();
  return WORK_SKIN_IDS.has(id) ? id : 'code';
}

function normalizeSkinThemeMode(value) {
  if (value === 'light' || value === 'dark' || value === 'follow') return value;
  return 'follow';
}

function normalizeTheme(value) {
  if (value === 'dark') return 'dark';
  if (value === 'light') return 'light';
  return '';
}

async function getConfig() {
  const r = await chrome.storage.local.get(['apiKey', 'apiSecret', 'environment', 'useProxy', 'proxyUrl', 'autoRefreshSeconds', 'opacity', 'language', 'theme', 'workSkin', 'skinThemeMode', 'openRouterApiKey', 'openRouterModel', 'serperApiKey', 'analysisLanguage', 'customAnalysisApiUrl', 'miroMindUrl']);
  const uiLangRaw = (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function')
    ? chrome.i18n.getUILanguage()
    : '';
  const defaultLang = String(uiLangRaw || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  return {
    apiKey: r.apiKey || '',
    apiSecret: r.apiSecret || '',
    environment: (r.environment === 'live' ? 'live' : 'demo'),
    useProxy: !!r.useProxy,
    proxyUrl: (r.proxyUrl || 'http://127.0.0.1:8765').replace(/\/$/, ''),
    autoRefreshSeconds: Math.max(0, parseInt(r.autoRefreshSeconds, 10) || 0),
    opacity: Math.min(1, Math.max(0, parseFloat(r.opacity) ?? 1)),
    language: (r.language === 'en' || r.language === 'zh') ? r.language : defaultLang,
    theme: normalizeTheme(r.theme),
    workSkin: normalizeWorkSkin(r.workSkin),
    skinThemeMode: normalizeSkinThemeMode(r.skinThemeMode),
    openRouterApiKey: (r.openRouterApiKey || '').trim(),
    openRouterModel: (r.openRouterModel || 'qwen/qwen3.5-plus-02-15:online').trim(),
    serperApiKey: (r.serperApiKey || '').trim(),
    analysisLanguage: (r.analysisLanguage === 'en' || r.analysisLanguage === 'zh' ? r.analysisLanguage : 'follow'),
    customAnalysisApiUrl: (r.customAnalysisApiUrl || '').trim(),
    miroMindUrl: (r.miroMindUrl || 'https://dr.miromind.ai/').trim() || 'https://dr.miromind.ai/'
  };
}

function buildAuthHeader(apiKey, apiSecret) {
  const credentials = btoa(unescape(encodeURIComponent(`${apiKey}:${apiSecret}`)));
  return `Basic ${credentials}`;
}

async function requestJson(path, config, method = 'GET', bodyObj = null) {
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
  const fetchOptions = { method, headers };
  if (bodyObj != null) {
    fetchOptions.body = JSON.stringify(bodyObj);
  }
  const res = await fetch(url, fetchOptions);
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    let msg = `请求失败 ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j.message) msg = j.message;
    } catch (_) {}
    const err = new Error(msg);
    err.status = res.status;
    err.retryAfter = res.headers.get('Retry-After');
    const resetHeader = res.headers.get('x-ratelimit-reset');
    if (resetHeader) err.rateLimitReset = parseInt(resetHeader, 10);
    throw err;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}

async function request(path, config) {
  return requestJson(path, config, 'GET');
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

function baseSymbolFromTicker(ticker) {
  const s = String(ticker || '').trim().toUpperCase();
  if (!s) return '';
  return s.split('_')[0];
}

function normalizeQuoteSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function normalizeTickerKey(ticker) {
  return String(ticker || '').trim().toUpperCase();
}

function tickerToStooqSymbol(ticker) {
  const base = baseSymbolFromTicker(ticker);
  if (!base) return '';
  if (STOOQ_SYMBOL_OVERRIDES[base]) return STOOQ_SYMBOL_OVERRIDES[base];
  if (base.startsWith('^')) return base.toLowerCase();
  return `${base.toLowerCase()}.us`;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function putQuoteAliases(map, key, quote) {
  const normalized = normalizeTickerKey(key);
  if (!normalized || !quote) return;
  map.set(normalized, quote);
  const base = baseSymbolFromTicker(normalized);
  if (base) map.set(base, quote);
}

function readCachedT212Quote(key, forceRefresh = false) {
  if (forceRefresh) return null;
  const normalized = normalizeTickerKey(key);
  if (!normalized) return null;
  const now = Date.now();
  const hit = t212QuotesCache.get(normalized);
  if (hit && (now - hit.ts) < T212_QUOTE_CACHE_TTL_MS) return hit.quote;
  return null;
}

function cacheT212QuoteWithAliases(key, quote) {
  const normalized = normalizeTickerKey(key);
  if (!normalized || !quote) return;
  const now = Date.now();
  t212QuotesCache.set(normalized, { ts: now, quote });
  const base = baseSymbolFromTicker(normalized);
  if (base) t212QuotesCache.set(base, { ts: now, quote });
}

function getRateLimitWaitMs(err, defaultSeconds = 20) {
  if (!err || typeof err !== 'object') return defaultSeconds * 1000;
  if (err.retryAfter) {
    const sec = parseInt(err.retryAfter, 10);
    if (Number.isFinite(sec) && sec > 0) return Math.min(sec, 300) * 1000;
  }
  if (err.rateLimitReset) {
    const wait = Math.ceil((Number(err.rateLimitReset) * 1000 - Date.now()) / 1000);
    if (Number.isFinite(wait) && wait > 0) return Math.min(wait, 300) * 1000;
  }
  return defaultSeconds * 1000;
}

function parseStooqCsvRows(csvText) {
  const text = typeof csvText === 'string' ? csvText.trim() : '';
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 8) continue;
    const symbolRaw = parts[0];
    const openRaw = parts[3];
    const closeRaw = parts[6];
    const symbol = normalizeQuoteSymbol(symbolRaw);
    if (!symbol || closeRaw === 'N/D') continue;
    const open = openRaw === 'N/D' ? null : Number(openRaw);
    const close = Number(closeRaw);
    if (Number.isNaN(close)) continue;
    const change = (open != null && !Number.isNaN(open)) ? (close - open) : null;
    const changePct = (change != null && open) ? (change / open * 100) : null;
    rows.push({
      symbol,
      name: symbol,
      currentPrice: close,
      change,
      changePct
    });
  }
  return rows;
}

async function getStooqQuotesBySymbols(symbols, forceRefresh = false) {
  const uniq = Array.from(new Set(
    (Array.isArray(symbols) ? symbols : [])
      .map(normalizeQuoteSymbol)
      .filter(Boolean)
  ));
  const out = new Map();
  const missing = [];
  const now = Date.now();

  uniq.forEach(symbol => {
    const cached = stooqQuotesCache.get(symbol);
    if (!forceRefresh && cached && (now - cached.ts) < STOOQ_QUOTE_CACHE_TTL_MS) {
      out.set(symbol, cached.quote);
    } else {
      missing.push(symbol);
    }
  });

  if (missing.length === 0) return out;

  const CHUNK_SIZE = 25;
  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const stooqSymbolsParam = chunk.map(s => encodeURIComponent(s.toLowerCase())).join('+');
    const url = `${STOOQ_QUOTE_ENDPOINT}?s=${stooqSymbolsParam}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const text = await res.text().catch(() => '');
    const results = parseStooqCsvRows(text);
    results.forEach(parsed => {
      const symbol = normalizeQuoteSymbol(parsed.symbol);
      stooqQuotesCache.set(symbol, { ts: Date.now(), quote: parsed });
      out.set(symbol, parsed);
    });
  }

  return out;
}

async function getQuoteByTickerFromStooq(inputTicker, forceRefresh = false) {
  const raw = String(inputTicker || '').trim().toUpperCase();
  if (!raw) throw new Error('请输入股票代码');
  const aliasTo = SYMBOL_ALIASES[raw] || raw;
  const symbol = baseSymbolFromTicker(aliasTo) || aliasTo;
  const stooqSymbol = tickerToStooqSymbol(symbol);
  if (!stooqSymbol) throw new Error('请输入股票代码');
  const map = await getStooqQuotesBySymbols([stooqSymbol], forceRefresh);
  const quote = map.get(normalizeQuoteSymbol(stooqSymbol));
  if (!quote) throw new Error(`未找到代码 ${raw}`);
  return {
    ticker: symbol,
    symbol,
    name: quote.name || symbol,
    currentPrice: quote.currentPrice,
    change: quote.change,
    changePct: quote.changePct,
    quantity: null,
    aliasFrom: raw !== symbol ? raw : ''
  };
}

function normalizeInstrumentList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw && (raw.items || raw.instruments || raw.data)) || [];
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    const ticker = item?.ticker || item?.instrument?.ticker || '';
    const name = item?.name || item?.instrument?.name || ticker || '—';
    return { ticker, name, raw: item };
  }).filter(x => x.ticker);
}

async function getInstrumentsMetadataCached(config) {
  const now = Date.now();
  if (instrumentsCache.items && (now - instrumentsCache.ts) < INSTRUMENTS_CACHE_TTL_MS) {
    return instrumentsCache.items;
  }
  const raw = await request('/equity/metadata/instruments', config);
  const items = normalizeInstrumentList(raw);
  instrumentsCache = { ts: now, items };
  return items;
}

async function resolveTickerInput(inputTicker, config) {
  const raw = String(inputTicker || '').trim().toUpperCase();
  if (!raw) throw new Error('请输入股票代码');
  const aliasTo = SYMBOL_ALIASES[raw] || raw;
  if (aliasTo.includes('_')) {
    return { resolvedTicker: aliasTo, aliasFrom: raw !== aliasTo ? raw : '' };
  }
  let all = [];
  try {
    all = await getInstrumentsMetadataCached(config);
  } catch (_) {
    return {
      resolvedTicker: `${aliasTo}_US_EQ`,
      aliasFrom: raw !== aliasTo ? raw : ''
    };
  }
  const matches = all.filter(i => baseSymbolFromTicker(i.ticker) === aliasTo);
  if (!matches.length) {
    throw new Error(`未找到代码 ${raw}，请尝试完整代码（例如 AAPL_US_EQ）`);
  }
  const preferred = matches.find(i => /_US_EQ$/.test(i.ticker)) || matches[0];
  return {
    resolvedTicker: preferred.ticker,
    aliasFrom: raw !== aliasTo ? raw : '',
    instrumentName: preferred.name
  };
}

function normalizeQuotePayload(payload, resolvedTicker, instrumentName, aliasFrom) {
  const data = payload && !Array.isArray(payload) ? payload : (Array.isArray(payload) ? payload[0] : {});
  const ticker = data?.ticker || resolvedTicker;
  const currentPrice = data?.currentPrice ?? data?.price ?? data?.lastPrice ?? null;
  const change = data?.ppl ?? data?.change ?? null;
  const changePct = data?.changePct ?? data?.dayChangePct ?? data?.percentageChange ?? null;
  const quantity = data?.quantity ?? null;
  return {
    ticker,
    symbol: baseSymbolFromTicker(ticker),
    name: instrumentName || data?.name || ticker,
    currentPrice,
    change,
    changePct,
    quantity,
    aliasFrom
  };
}

/**
 * 通过 Trading212 官方接口按 ticker 查询实时行情。
 * 支持输入短代码（如 MP），内部会解析为完整 ticker（如 MP_US_EQ）。
 */
async function getQuoteByTickerWithConfig(inputTicker, config) {
  const { resolvedTicker, aliasFrom, instrumentName } = await resolveTickerInput(inputTicker, config);
  let payload;
  try {
    payload = await requestJson('/equity/portfolio/ticker', config, 'POST', { ticker: resolvedTicker });
  } catch (err) {
    // Fallback for legacy endpoints where query by ticker is available.
    if (err && err.status === 404) {
      const fallback = await request(`/equity/positions?ticker=${encodeURIComponent(resolvedTicker)}`, config);
      payload = Array.isArray(fallback) ? fallback[0] : fallback;
    } else {
      throw err;
    }
  }
  const quote = normalizeQuotePayload(payload, resolvedTicker, instrumentName, aliasFrom);
  if (quote.currentPrice == null) {
    throw new Error(`已找到 ${quote.ticker}，但未返回现价`);
  }
  return quote;
}

async function getT212QuotesByTickers(tickers, config, forceRefresh = false) {
  const out = new Map();
  if (!config || !config.apiKey || !config.apiSecret) return out;
  // Trading 212 /equity/portfolio/ticker 在扩展直连模式下常被 CORS/PNA 拦截；
  // 仅在启用本地代理时请求该端点，避免 sidepanel 持续记录错误。
  if (!config.useProxy) return out;
  if (Date.now() < t212QuotesRateLimitUntil) return out;
  const uniqTickers = Array.from(new Set(
    (Array.isArray(tickers) ? tickers : [])
      .map(t => String(t || '').trim())
      .filter(Boolean)
  ));
  if (!uniqTickers.length) return out;

  const pending = [];
  uniqTickers.forEach(ticker => {
    const cached = readCachedT212Quote(ticker, forceRefresh);
    if (cached) {
      putQuoteAliases(out, ticker, cached);
      return;
    }
    pending.push(ticker);
  });
  if (!pending.length) return out;

  const workerCount = Math.min(T212_QUOTE_CONCURRENCY, pending.length);
  const worker = async () => {
    while (pending.length > 0) {
      const ticker = pending.shift();
      if (!ticker) continue;
      try {
        const quote = await getQuoteByTickerWithConfig(ticker, config);
        const normalized = {
          ticker: normalizeTickerKey(quote.ticker || ticker),
          symbol: baseSymbolFromTicker(quote.symbol || quote.ticker || ticker),
          name: quote.name || quote.ticker || ticker,
          currentPrice: toFiniteNumber(quote.currentPrice),
          change: toFiniteNumber(quote.change),
          changePct: toFiniteNumber(quote.changePct)
        };
        if (normalized.currentPrice == null) continue;
        putQuoteAliases(out, ticker, normalized);
        putQuoteAliases(out, normalized.ticker, normalized);
        putQuoteAliases(out, normalized.symbol, normalized);
        cacheT212QuoteWithAliases(ticker, normalized);
        cacheT212QuoteWithAliases(normalized.ticker, normalized);
        cacheT212QuoteWithAliases(normalized.symbol, normalized);
      } catch (err) {
        if (err && err.status === 429) {
          t212QuotesRateLimitUntil = Date.now() + getRateLimitWaitMs(err, 20);
          pending.length = 0;
          return;
        }
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return out;
}

export async function getQuoteByTicker(inputTicker) {
  let config = null;
  try {
    config = await getConfig();
  } catch (_) {
    config = null;
  }

  // 直连模式跳过 /portfolio/ticker，避免 CORS/PNA 报错噪音。
  if (!config || !config.useProxy) {
    return getQuoteByTickerFromStooq(inputTicker);
  }

  let lastErr = null;
  try {
    return await getQuoteByTickerWithConfig(inputTicker, config);
  } catch (err) {
    lastErr = err;
  }
  try {
    return await getQuoteByTickerFromStooq(inputTicker);
  } catch (_) {
    throw lastErr || new Error('查询失败');
  }
}

function normalizeOrderSide(inputSide) {
  const side = String(inputSide || '').trim().toUpperCase();
  if (side !== 'BUY' && side !== 'SELL') throw new Error('交易方向必须是 BUY 或 SELL');
  return side;
}

function normalizeOrderQuantity(inputQuantity, side) {
  const quantity = Number(inputQuantity);
  if (!Number.isFinite(quantity) || quantity === 0) throw new Error('数量必须大于 0');
  const absQuantity = Math.abs(quantity);
  if (absQuantity <= 0) throw new Error('数量必须大于 0');
  return side === 'SELL' ? -absQuantity : absQuantity;
}

function normalizeOrderPrice(inputPrice, label) {
  const price = Number(inputPrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`${label} 必须大于 0`);
  return price;
}

function normalizeOrderTimeValidity(inputTimeValidity) {
  const timeValidity = String(inputTimeValidity || 'DAY').trim().toUpperCase();
  if (timeValidity !== 'DAY' && timeValidity !== 'GOOD_TILL_CANCEL') {
    throw new Error('有效期必须是 DAY 或 GOOD_TILL_CANCEL');
  }
  return timeValidity;
}

async function buildOrderPayloadBase(input, config) {
  const side = normalizeOrderSide(input && input.side);
  const quantity = normalizeOrderQuantity(input && input.quantity, side);
  const { resolvedTicker } = await resolveTickerInput(input && input.ticker, config);
  return { side, quantity, ticker: resolvedTicker };
}

export async function placeMarketOrder(input) {
  const config = await getConfig();
  const base = await buildOrderPayloadBase(input, config);
  return requestJson('/equity/orders/market', config, 'POST', {
    ticker: base.ticker,
    quantity: base.quantity,
    extendedHours: !!(input && input.extendedHours)
  });
}

export async function placeLimitOrder(input) {
  const config = await getConfig();
  const base = await buildOrderPayloadBase(input, config);
  return requestJson('/equity/orders/limit', config, 'POST', {
    ticker: base.ticker,
    quantity: base.quantity,
    limitPrice: normalizeOrderPrice(input && input.limitPrice, '限价'),
    timeValidity: normalizeOrderTimeValidity(input && input.timeValidity)
  });
}

export async function placeStopOrder(input) {
  const config = await getConfig();
  const base = await buildOrderPayloadBase(input, config);
  return requestJson('/equity/orders/stop', config, 'POST', {
    ticker: base.ticker,
    quantity: base.quantity,
    stopPrice: normalizeOrderPrice(input && input.stopPrice, '止损触发价'),
    timeValidity: normalizeOrderTimeValidity(input && input.timeValidity)
  });
}

export async function placeStopLimitOrder(input) {
  const config = await getConfig();
  const base = await buildOrderPayloadBase(input, config);
  return requestJson('/equity/orders/stop_limit', config, 'POST', {
    ticker: base.ticker,
    quantity: base.quantity,
    stopPrice: normalizeOrderPrice(input && input.stopPrice, '止损触发价'),
    limitPrice: normalizeOrderPrice(input && input.limitPrice, '限价'),
    timeValidity: normalizeOrderTimeValidity(input && input.timeValidity)
  });
}

export async function getPendingOrders() {
  const config = await getConfig();
  const data = await request('/equity/orders', config);
  return Array.isArray(data) ? data : [];
}

export async function cancelPendingOrder(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error('无效订单 ID');
  }
  const config = await getConfig();
  return requestJson(`/equity/orders/${encodeURIComponent(String(Math.trunc(numericId)))}`, config, 'DELETE');
}

export async function getHistoricalOrders(params = {}) {
  const config = await getConfig();
  const query = new URLSearchParams();
  if (params && params.ticker) {
    query.set('ticker', String(params.ticker).trim().toUpperCase());
  }
  if (params && params.limit != null && params.limit !== '') {
    const limitNum = Number(params.limit);
    if (Number.isFinite(limitNum) && limitNum > 0) {
      query.set('limit', String(Math.min(50, Math.floor(limitNum))));
    }
  }
  if (params && params.cursor != null && params.cursor !== '') {
    query.set('cursor', String(params.cursor));
  }
  const queryString = query.toString();
  const path = queryString ? `/equity/history/orders?${queryString}` : '/equity/history/orders';
  return request(path, config);
}

function normalizeWatchlistItems(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw && (raw.instruments || raw.items || raw.symbols || raw.tickers || raw.data)) || [];
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    const instrument = item && item.instrument ? item.instrument : {};
    const ticker = item?.ticker || instrument?.ticker || item?.symbol || '';
    const name = item?.name || instrument?.name || ticker || '—';
    const price = item?.currentPrice ?? item?.lastPrice ?? item?.price ?? item?.close ?? null;
    const change = item?.change ?? item?.dayChange ?? item?.changeAmount ?? null;
    const changePct = item?.changePct ?? item?.dayChangePct ?? item?.percentageChange ?? item?.changePercentage ?? null;
    return { ticker, name, price, change, changePct };
  }).filter(x => x.ticker || x.name);
}

/**
 * 尝试获取 Watchlist（兼容不同路径/返回结构）。
 * 优先取第一个 watchlist，返回标准化后的条目。
 */
export async function getWatchlistItems(configOverride) {
  const config = configOverride || await getConfig();
  let listPayload;
  try {
    listPayload = await request('/equity/watchlists', config);
  } catch (_) {
    const direct = await request('/equity/watchlist', config);
    return normalizeWatchlistItems(direct);
  }

  const lists = Array.isArray(listPayload)
    ? listPayload
    : (listPayload && (listPayload.watchlists || listPayload.items || listPayload.data)) || [];
  if (!Array.isArray(lists) || lists.length === 0) return [];

  const first = lists[0] || {};
  const id = first.id ?? first.watchlistId ?? first.uuid ?? '';
  if (!id) return normalizeWatchlistItems(first);

  let details;
  try {
    details = await request(`/equity/watchlists/${encodeURIComponent(String(id))}`, config);
  } catch (_) {
    details = await request(`/equity/watchlists/${encodeURIComponent(String(id))}/instruments`, config);
  }
  return normalizeWatchlistItems(details);
}

export function getDefaultWatchlistItems() {
  return DEFAULT_WATCHLIST_ITEMS.map(item => ({
    ticker: item.ticker,
    name: item.name,
    price: null,
    change: null,
    changePct: null
  }));
}

export async function enrichWatchlistItemsWithQuotes(items, forceRefresh = false, configOverride = null) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const merged = items.map(item => ({ ...item }));
  const tickers = merged
    .map(item => item.ticker || item.symbol || '')
    .filter(Boolean);
  if (!tickers.length) return merged;

  let config = configOverride || null;
  if (!config) {
    try {
      config = await getConfig();
    } catch (_) {
      config = null;
    }
  }

  let realtimeMap = new Map();
  if (config && config.apiKey && config.apiSecret) {
    try {
      realtimeMap = await getT212QuotesByTickers(tickers, config, forceRefresh);
    } catch (_) {}
  }

  const fallbackSymbols = merged
    .map(item => {
      const tickerRaw = item.ticker || item.symbol || '';
      const tickerKey = normalizeTickerKey(tickerRaw);
      const baseKey = baseSymbolFromTicker(tickerKey);
      const realtime = realtimeMap.get(tickerKey) || (baseKey ? realtimeMap.get(baseKey) : null);
      if (realtime) return '';
      return tickerToStooqSymbol(tickerRaw);
    })
    .filter(Boolean);

  let stooqMap = new Map();
  if (fallbackSymbols.length > 0) {
    try {
      stooqMap = await getStooqQuotesBySymbols(fallbackSymbols, forceRefresh);
    } catch (_) {}
  }

  merged.forEach(item => {
    const tickerRaw = item.ticker || item.symbol || '';
    const tickerKey = normalizeTickerKey(tickerRaw);
    const baseKey = baseSymbolFromTicker(tickerKey);
    const realtime = realtimeMap.get(tickerKey) || (baseKey ? realtimeMap.get(baseKey) : null);
    if (realtime) {
      if (!item.name) item.name = realtime.name || item.ticker || '—';
      if (realtime.currentPrice != null) item.price = realtime.currentPrice;
      if (realtime.change != null) item.change = realtime.change;
      if (realtime.changePct != null) item.changePct = realtime.changePct;
      return;
    }

    const stooqSymbol = normalizeQuoteSymbol(tickerToStooqSymbol(tickerRaw));
    if (!stooqSymbol) return;
    const quote = stooqMap.get(stooqSymbol);
    if (!quote) return;
    if (!item.name) item.name = quote.name || item.ticker || '—';
    if (quote.currentPrice != null) item.price = quote.currentPrice;
    if (quote.change != null) item.change = quote.change;
    if (quote.changePct != null) item.changePct = quote.changePct;
  });
  return merged;
}

export async function getDefaultWatchlistWithQuotes(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && defaultWatchlistQuotesCache.items && (now - defaultWatchlistQuotesCache.ts) < DEFAULT_WATCHLIST_QUOTES_CACHE_TTL_MS) {
    return defaultWatchlistQuotesCache.items.map(item => ({ ...item }));
  }

  const base = getDefaultWatchlistItems();
  const prevMap = new Map(
    (defaultWatchlistQuotesCache.items || []).map(item => [item.ticker, item])
  );
  const merged = base.map(item => {
    const prev = prevMap.get(item.ticker);
    return prev
      ? { ...item, price: prev.price, change: prev.change, changePct: prev.changePct }
      : item;
  });

  const withQuotes = await enrichWatchlistItemsWithQuotes(merged, forceRefresh);

  defaultWatchlistQuotesCache = {
    ts: now,
    items: withQuotes.map(item => ({ ...item }))
  };
  return withQuotes;
}

/** 共享缓存：popup 与 sidepanel 共用，避免连续打开时双请求触发 429 */
const CACHE_KEY = 't212_cache';
const RATE_LIMIT_KEY = 't212_rateLimitUntil';
const CUSTOM_WATCHLIST_KEY = 't212_customWatchlist';
const CACHE_TTL_MS = 28 * 1000;

function normalizeWatchlistItem(item) {
  if (!item || typeof item !== 'object') return null;
  const tickerRaw = item.ticker || item.symbol || '';
  const ticker = baseSymbolFromTicker(tickerRaw);
  if (!ticker) return null;
  const name = String(item.name || ticker).trim() || ticker;
  const price = item.price != null ? Number(item.price) : null;
  const change = item.change != null ? Number(item.change) : null;
  const changePct = item.changePct != null ? Number(item.changePct) : null;
  return {
    ticker,
    name,
    price: Number.isNaN(price) ? null : price,
    change: Number.isNaN(change) ? null : change,
    changePct: Number.isNaN(changePct) ? null : changePct
  };
}

function uniqueWatchlistByTicker(items) {
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach(item => {
    const normalized = normalizeWatchlistItem(item);
    if (!normalized) return;
    if (!map.has(normalized.ticker)) map.set(normalized.ticker, normalized);
  });
  return Array.from(map.values());
}

export async function getCustomWatchlistItems() {
  const r = await chrome.storage.local.get(CUSTOM_WATCHLIST_KEY);
  return uniqueWatchlistByTicker(r[CUSTOM_WATCHLIST_KEY]);
}

export async function addCustomWatchlistItem(item) {
  const normalized = normalizeWatchlistItem(item);
  if (!normalized) throw new Error('无效股票代码');
  const current = await getCustomWatchlistItems();
  const merged = uniqueWatchlistByTicker([...current, normalized]);
  await chrome.storage.local.set({ [CUSTOM_WATCHLIST_KEY]: merged });
  return merged;
}

export async function getCachedData() {
  const r = await chrome.storage.local.get(CACHE_KEY);
  const c = r[CACHE_KEY];
  if (!c || !c.ts) return null;
  if (Date.now() - c.ts > CACHE_TTL_MS) return null;
  return { summary: c.summary, positions: c.positions || [], ts: c.ts };
}

export async function setCachedData(summary, positions) {
  await chrome.storage.local.set({
    [CACHE_KEY]: { summary, positions, ts: Date.now() }
  });
}

export async function getRateLimitUntil() {
  const r = await chrome.storage.local.get(RATE_LIMIT_KEY);
  return Number(r[RATE_LIMIT_KEY]) || 0;
}

export async function setRateLimitUntil(ts) {
  await chrome.storage.local.set({ [RATE_LIMIT_KEY]: ts });
}

function buildAnalysisPrompts(positions, summary, lang, customUserContent) {
  const isZh = lang !== 'en';
  const posLines = (positions || []).slice(0, 30).map(p => {
    const name = (p.instrument && p.instrument.name) || p.ticker || '—';
    const ticker = (p.instrument && p.instrument.ticker) || '';
    const qty = p.quantity != null ? p.quantity : '—';
    const price = p.currentPrice != null ? p.currentPrice : '—';
    const pl = (p.walletImpact && p.walletImpact.unrealizedProfitLoss != null) ? p.walletImpact.unrealizedProfitLoss : null;
    const value = (p.walletImpact && p.walletImpact.currentValue != null) ? p.walletImpact.currentValue : null;
    return `${ticker || name} | 数量 ${qty} | 现价 ${price} | 市值 ${value != null ? value : '—'} | 未实现盈亏 ${pl != null ? pl : '—'}`;
  }).join('\n');
  const totalValue = summary && summary.totalValue != null ? summary.totalValue : '';
  const cash = summary && summary.cash && summary.cash.availableToTrade != null ? summary.cash.availableToTrade : '';
  const currency = summary && summary.currency ? summary.currency : '';

  const systemPrompt = isZh
    ? `你是一位专业的股票分析助手。根据用户当前持仓与账户概况，请完整写出：1) 今日大盘/相关板块与宏观简要看法；2) 对持仓标的或整体今日涨跌的预判（可逐只或分板块）；3) 具体操作建议：哪些建议减仓/卖出、哪些可考虑加仓/买入，并简要说明理由。用分点或短段，结构清晰，不必刻意压缩字数。请务必${ANALYSIS_GLOBAL_REQUIREMENT}。`
    : `You are a professional stock analyst. Given the user's current holdings and account summary, write a full analysis: 1) Brief view on today's market/sector and macro context; 2) Outlook for today (up/down by position or overall); 3) Action suggestions: what to trim/sell vs. consider buying, with brief reasoning. Use bullets or short paragraphs, no need to limit length. You must include this requirement: ${ANALYSIS_GLOBAL_REQUIREMENT}.`;

  const defaultUserContent = isZh
    ? `账户总资产约 ${totalValue} ${currency}，可用现金约 ${cash} ${currency}。\n当前持仓：\n${posLines || '（暂无持仓）'}\n请给出今日行情分析与操作建议。`
    : `Account total ~${totalValue} ${currency}, cash ~${cash} ${currency}.\nPositions:\n${posLines || '(none)'}\nGive today\'s market analysis and action suggestions.`;
  const userContent = (typeof customUserContent === 'string' && customUserContent.trim())
    ? customUserContent.trim()
    : defaultUserContent;
  const mergedUserContent = userContent.includes(ANALYSIS_GLOBAL_REQUIREMENT)
    ? userContent
    : `${userContent}\n${ANALYSIS_GLOBAL_REQUIREMENT}`;
  return { systemPrompt, userContent: mergedUserContent };
}

/** 生成一条可粘贴到 MiroMind 等外部的「分析请求」文案（仅用本地数据，不调 API）。 */
export function getPromptForMiroMind(positions, summary, lang) {
  const { userContent } = buildAnalysisPrompts(positions, summary, lang);
  const isZh = lang !== 'en';
  const prefix = isZh
    ? '请根据以下账户与持仓，做今日行情分析并给出操作建议：\n\n'
    : 'Based on the following account and positions, give today\'s market analysis and action suggestions:\n\n';
  return prefix + userContent;
}

/** 调用自建分析 API（如 MiroMind/MiroThinker）。POST OpenAI 兼容的 messages，或接受 prompt/response 格式。 */
export async function getMarketAnalysisCustom(apiUrl, positions, summary, lang, customPrompt) {
  const { systemPrompt, userContent } = buildAnalysisPrompts(positions, summary, lang, customPrompt);
  const url = apiUrl.replace(/\/$/, '');
  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    max_tokens: 4096
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`自定义 API 请求失败 ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
    ? data.choices[0].message.content.trim()
    : (data.text || data.response || data.content || '').trim();
  if (!text) throw new Error('未返回分析内容');
  return text;
}

/** 用 OpenRouter 生成行情分析与操作建议（结合当前持仓）。model 来自选项「分析模型」。 */
export async function getMarketAnalysis(positions, summary, lang, openRouterApiKey, model, customPrompt) {
  if (!openRouterApiKey) throw new Error('请在选项中配置 OpenRouter API Key');
  const modelId = (model || 'qwen/qwen3.5-plus-02-15:online').trim();
  const { systemPrompt, userContent } = buildAnalysisPrompts(positions, summary, lang, customPrompt);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterApiKey}`,
      'HTTP-Referer': 'https://t212-agent.local/'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userContent } ],
      max_tokens: 4096
    })
  });
  if (!res.ok) {
    const err = new Error(res.status === 401 ? 'OpenRouter API Key 无效或已过期' : `请求失败 ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const choice = data.choices && data.choices[0];
  const text = choice && choice.message && choice.message.content ? choice.message.content.trim() : '';
  if (!text) throw new Error('未返回分析内容');
  return text;
}

/** 根据配置选择：有自定义 API 则调自建（如 MiroMind），否则调 OpenRouter。 */
export async function getMarketAnalysisFromConfig(config, positions, summary, lang, model, customPrompt) {
  if (config.customAnalysisApiUrl) {
    return getMarketAnalysisCustom(config.customAnalysisApiUrl, positions, summary, lang, customPrompt);
  }
  return getMarketAnalysis(positions, summary, lang, config.openRouterApiKey, model, customPrompt);
}

export { getConfig };
