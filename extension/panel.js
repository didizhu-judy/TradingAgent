/* 共用数据与渲染逻辑：popup / sidepanel / widget 均可使用 */
import { getAccountSummary, getPositions, getConfig } from './api.js';

const el = {
  empty: document.getElementById('state-empty'),
  loading: document.getElementById('state-loading'),
  error: document.getElementById('state-error'),
  content: document.getElementById('content'),
  summaryRows: document.getElementById('summaryRows'),
  positionsList: document.getElementById('positionsList'),
  refresh: document.getElementById('refresh'),
  openOptions: document.getElementById('openOptions')
};

function show(which) {
  el.empty.classList.add('hidden');
  el.loading.classList.add('hidden');
  el.error.classList.add('hidden');
  el.content.classList.add('hidden');
  if (which === 'empty') el.empty.classList.remove('hidden');
  else if (which === 'loading') el.loading.classList.remove('hidden');
  else if (which === 'error') el.error.classList.remove('hidden');
  else if (which === 'content') el.content.classList.remove('hidden');
}

function fmtNum(n) {
  if (n == null || n === undefined) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderSummary(data) {
  const c = data.currency || '';
  const rows = [
    { label: '总资产', value: data.totalValue, fmt: true },
    { label: '可用现金', value: data.cash?.availableToTrade, fmt: true },
    { label: '投资市值', value: data.investments?.currentValue, fmt: true },
    { label: '未实现盈亏', value: data.investments?.unrealizedProfitLoss, fmt: true, color: true },
    { label: '已实现盈亏', value: data.investments?.realizedProfitLoss, fmt: true, color: true }
  ];
  el.summaryRows.innerHTML = rows.map(function(r) {
    let v = r.fmt ? fmtNum(r.value) + ' ' + c : (r.value != null ? r.value : '—');
    let cls = '';
    if (r.color && r.value != null) cls = Number(r.value) >= 0 ? 'positive' : 'negative';
    return '<div class="summary-row"><span class="label">' + r.label + '</span><span class="value ' + cls + '">' + v + '</span></div>';
  }).join('');
}

function renderPositions(list) {
  if (!list || list.length === 0) {
    el.positionsList.innerHTML = '<div class="position-card">暂无持仓</div>';
    return;
  }
  el.positionsList.innerHTML = list.map(function(p) {
    const name = (p.instrument && p.instrument.name) || p.ticker || '—';
    const ticker = (p.instrument && p.instrument.ticker) || '';
    const qty = p.quantity != null ? p.quantity : '—';
    const curr = p.currentPrice != null ? fmtNum(p.currentPrice) : '—';
    const cost = p.averagePricePaid != null ? fmtNum(p.averagePricePaid) : '—';
    const pl = (p.walletImpact && p.walletImpact.unrealizedProfitLoss != null) ? p.walletImpact.unrealizedProfitLoss : null;
    const totalCost = (p.walletImpact && p.walletImpact.totalCost != null) ? p.walletImpact.totalCost : 0;
    let pct = '';
    if (pl != null && totalCost && totalCost !== 0) pct = ' (' + (pl / totalCost * 100).toFixed(2) + '%)';
    const plCls = pl != null && pl >= 0 ? 'position-pl positive' : 'position-pl negative';
    const plStr = pl != null ? fmtNum(pl) + pct : '—';
    return '<div class="position-card"><div class="position-name">' + name + '</div><div class="position-ticker">' + ticker + '</div><div class="position-row"><span>数量 ' + qty + '</span><span>现价 ' + curr + '</span></div><div class="position-row"><span>成本 ' + cost + '</span><span class="' + plCls + '">' + plStr + '</span></div></div>';
  }).join('');
}

function setError(msg) {
  el.error.textContent = msg;
  show('error');
}

async function load() {
  const config = await getConfig();
  if (!config.apiKey || !config.apiSecret) {
    show('empty');
    return;
  }
  show('loading');
  if (el.loading) el.loading.classList.add('loading-dots');
  if (el.refresh) el.refresh.disabled = true;
  try {
    const [summary, positions] = await Promise.all([getAccountSummary(), getPositions()]);
    renderSummary(summary);
    renderPositions(Array.isArray(positions) ? positions : []);
    show('content');
  } catch (err) {
    setError(err.message || '请求失败');
  } finally {
    if (el.loading) el.loading.classList.remove('loading-dots');
    if (el.refresh) el.refresh.disabled = false;
  }
}

if (el.refresh) el.refresh.addEventListener('click', load);
if (el.openOptions) el.openOptions.addEventListener('click', function(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

load();
