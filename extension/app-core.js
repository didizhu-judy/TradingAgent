/**
 * 共用渲染与工具（popup / sidepanel / widget）
 * 渲染函数可传入 lang（'zh'|'en'）以使用对应文案。
 */
import { t } from './i18n.js';

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function orderTypeLabel(type, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const map = {
    MARKET: t(L, 'order_type_market'),
    LIMIT: t(L, 'order_type_limit'),
    STOP: t(L, 'order_type_stop'),
    STOP_LIMIT: t(L, 'order_type_stop_limit')
  };
  return map[type] || type || '—';
}

function sideLabel(side, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  return side === 'SELL' ? t(L, 'order_side_sell') : t(L, 'order_side_buy');
}

export function fmtNum(n) {
  if (n == null || n === undefined) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatLastUpdated(ms, autoRefreshSeconds) {
  if (!ms) return '';
  const d = new Date(ms);
  let text = '最后更新 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (autoRefreshSeconds > 0) {
    text += ' · ' + autoRefreshSeconds + 's 后自动刷新';
  }
  return text;
}

export function sortPositions(list, key) {
  if (!list || !Array.isArray(list)) return [];
  const arr = [...list];
  if (key === 'name') {
    arr.sort((a, b) => {
      const na = (a.instrument && a.instrument.name) || a.ticker || '';
      const nb = (b.instrument && b.instrument.name) || b.ticker || '';
      return na.localeCompare(nb);
    });
  } else if (key === 'pl') {
    arr.sort((a, b) => {
      const pa = (a.walletImpact && a.walletImpact.unrealizedProfitLoss != null) ? a.walletImpact.unrealizedProfitLoss : -Infinity;
      const pb = (b.walletImpact && b.walletImpact.unrealizedProfitLoss != null) ? b.walletImpact.unrealizedProfitLoss : -Infinity;
      return pb - pa; // 盈亏从高到低
    });
  } else {
    // value: 按市值
    arr.sort((a, b) => {
      const va = (a.walletImpact && a.walletImpact.currentValue != null) ? a.walletImpact.currentValue : 0;
      const vb = (b.walletImpact && b.walletImpact.currentValue != null) ? b.walletImpact.currentValue : 0;
      return vb - va;
    });
  }
  return arr;
}

export function renderSummaryRows(data, lang) {
  if (!data) return '';
  const L = lang === 'en' ? 'en' : 'zh';
  const c = data.currency || '';
  const rows = [
    { labelKey: 'label_total_value', value: data.totalValue, fmt: true },
    { labelKey: 'label_available_cash', value: data.cash?.availableToTrade, fmt: true },
    { labelKey: 'label_investments_value', value: data.investments?.currentValue, fmt: true },
    { labelKey: 'label_unrealized_pl', value: data.investments?.unrealizedProfitLoss, fmt: true, color: true },
    { labelKey: 'label_realized_pl', value: data.investments?.realizedProfitLoss, fmt: true, color: true }
  ];
  return rows.map(function(r) {
    const label = t(L, r.labelKey);
    let v = r.fmt ? fmtNum(r.value) + ' ' + c : (r.value != null ? r.value : '—');
    let cls = '';
    if (r.color && r.value != null) cls = Number(r.value) >= 0 ? 'positive' : 'negative';
    return '<div class="summary-row"><span class="label">' + label + '</span><span class="value ' + cls + '">' + v + '</span></div>';
  }).join('');
}

export function renderCashRows(data, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const c = (data && data.currency) || '';
  const cash = data && data.cash;
  if (!cash) return '<div class="hint-text">' + t(L, 'no_cash_data') + '</div>';
  const rows = [
    { labelKey: 'label_available_to_trade', value: cash.availableToTrade },
    { labelKey: 'label_blocked', value: cash.blocked },
    { labelKey: 'label_free', value: cash.free },
    { labelKey: 'label_invested', value: cash.invested },
    { labelKey: 'label_payout', value: cash.payout }
  ].filter(r => r.value != null && r.value !== undefined);
  if (rows.length === 0 && cash.availableToTrade != null) {
    const label = t(L, 'label_available_to_trade');
    return '<div class="summary-row"><span class="label">' + label + '</span><span class="value">' + fmtNum(cash.availableToTrade) + ' ' + c + '</span></div>';
  }
  if (rows.length === 0) return '<div class="hint-text">' + t(L, 'no_cash_data') + '</div>';
  return rows.map(function(r) {
    const label = t(L, r.labelKey);
    const v = fmtNum(r.value) + ' ' + c;
    return '<div class="summary-row"><span class="label">' + label + '</span><span class="value">' + v + '</span></div>';
  }).join('');
}

export function renderPositionsList(list, sortKey, options = {}) {
  const lang = options.lang === 'en' ? 'en' : 'zh';
  const noPos = t(lang, 'no_positions');
  const lblQty = t(lang, 'label_qty');
  const lblPrice = t(lang, 'label_price');
  const lblCost = t(lang, 'label_cost');
  if (!list || !Array.isArray(list)) return '<div class="position-card">' + noPos + '</div>';
  const clickable = options.clickable !== false;
  const sorted = sortPositions(list, sortKey || 'value');
  if (!sorted.length) return '<div class="position-card">' + noPos + '</div>';
  return sorted.map(function(p, i) {
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
    const dataIdx = clickable ? ' data-position-index="' + i + '"' : '';
    const clickCls = clickable ? ' clickable' : '';
    const tabIdx = clickable ? ' tabindex="0" role="button"' : '';
    return '<div class="position-card' + clickCls + '"' + dataIdx + tabIdx + '><div class="position-name">' + name + '</div><div class="position-ticker">' + ticker + '</div><div class="position-row"><span>' + lblQty + ' ' + qty + '</span><span>' + lblPrice + ' ' + curr + '</span></div><div class="position-row"><span>' + lblCost + ' ' + cost + '</span><span class="' + plCls + '">' + plStr + '</span></div></div>';
  }).join('');
}

export function renderWatchlistList(list, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const noData = t(L, 'no_watchlist');
  const lblPrice = t(L, 'label_price');
  const lblChange = t(L, 'label_change');
  const lblTrade = t(L, 'trade_buy');
  if (!list || !Array.isArray(list) || list.length === 0) {
    return '<div class="position-card">' + noData + '</div>';
  }
  return list.map(function(item, index) {
    const name = item.name || item.ticker || '—';
    const ticker = item.ticker || '';
    const price = item.price != null ? fmtNum(item.price) : '—';
    const change = item.change != null ? Number(item.change) : null;
    const changePct = item.changePct != null ? Number(item.changePct) : null;
    const cls = change == null ? '' : (change >= 0 ? 'position-pl positive' : 'position-pl negative');
    const changeText = change == null
      ? '—'
      : (fmtNum(change) + (changePct != null ? ' (' + changePct.toFixed(2) + '%)' : ''));
    const tradeBtn = ticker
      ? '<button type="button" class="secondary watchlist-trade-btn" data-watchlist-index="' + String(index) + '">' + lblTrade + '</button>'
      : '';
    return '<div class="position-card watchlist-card"><div class="position-name">' + name + '</div><div class="position-ticker">' + ticker + '</div><div class="position-row watchlist-row"><span class="watchlist-price">' + lblPrice + ' ' + price + '</span><span class="watchlist-change ' + cls + '">' + lblChange + ' ' + changeText + '</span>' + tradeBtn + '</div></div>';
  }).join('');
}

export function renderQuoteResult(quote, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  if (!quote) return '';
  const lblTicker = t(L, 'label_ticker');
  const lblPrice = t(L, 'label_price');
  const lblChange = t(L, 'label_change');
  const lblQty = t(L, 'label_qty');
  const name = quote.name || quote.ticker || '—';
  const ticker = quote.ticker || '—';
  const price = quote.currentPrice != null ? fmtNum(quote.currentPrice) : '—';
  const change = quote.change != null ? Number(quote.change) : null;
  const changeCls = change == null ? '' : (change >= 0 ? 'positive' : 'negative');
  const changeStr = change == null ? '—' : fmtNum(change);
  const qtyStr = quote.quantity == null ? '—' : String(quote.quantity);
  const aliasHint = quote.aliasFrom ? `<div class="hint-text">${quote.aliasFrom} -> ${quote.symbol || ''}</div>` : '';
  return '<div class="detail-card"><div class="detail-title">' + name + '</div>' +
    '<div class="detail-row"><span class="label">' + lblTicker + '</span><span class="value">' + ticker + '</span></div>' +
    '<div class="detail-row"><span class="label">' + lblPrice + '</span><span class="value">' + price + '</span></div>' +
    '<div class="detail-row"><span class="label">' + lblChange + '</span><span class="value ' + changeCls + '">' + changeStr + '</span></div>' +
    '<div class="detail-row"><span class="label">' + lblQty + '</span><span class="value">' + qtyStr + '</span></div>' +
    aliasHint +
    '</div>';
}

export function renderWatchlistSearchResult(quote, lang, inWatchlist) {
  const L = lang === 'en' ? 'en' : 'zh';
  const quoteHtml = renderQuoteResult(quote, lang);
  const addLabel = t(L, inWatchlist ? 'watchlist_in_list' : 'watchlist_add');
  const addBtn = inWatchlist
    ? '<button type="button" class="secondary" disabled>' + addLabel + '</button>'
    : '<button type="button" class="primary" id="watchlistAddFromSearch">' + addLabel + '</button>';
  const tradeBtn = '<button type="button" class="secondary" id="watchlistTradeFromSearch">' + t(L, 'trade_buy') + '</button>';
  const actionHtml = addBtn + tradeBtn;
  return quoteHtml + '<div class="watchlist-search-actions">' + actionHtml + '</div>';
}

export function renderPositionDetail(position, currency, lang) {
  if (!position) return '';
  const L = lang === 'en' ? 'en' : 'zh';
  const c = currency || '';
  const name = (position.instrument && position.instrument.name) || position.ticker || '—';
  const ticker = (position.instrument && position.instrument.ticker) || '—';
  const qty = position.quantity != null ? position.quantity : '—';
  const curr = position.currentPrice != null ? fmtNum(position.currentPrice) : '—';
  const cost = position.averagePricePaid != null ? fmtNum(position.averagePricePaid) : '—';
  const currentValue = (position.walletImpact && position.walletImpact.currentValue != null) ? position.walletImpact.currentValue : null;
  const totalCost = (position.walletImpact && position.walletImpact.totalCost != null) ? position.walletImpact.totalCost : null;
  const pl = (position.walletImpact && position.walletImpact.unrealizedProfitLoss != null) ? position.walletImpact.unrealizedProfitLoss : null;
  let pctStr = '—';
  if (pl != null && totalCost && totalCost !== 0) pctStr = (pl / totalCost * 100).toFixed(2) + '%';
  const plCls = pl != null && pl >= 0 ? 'positive' : 'negative';
  const plStr = pl != null ? fmtNum(pl) + ' ' + c : '—';
  const valueStr = currentValue != null ? fmtNum(currentValue) + ' ' + c : '—';
  const costStr = totalCost != null ? fmtNum(totalCost) + ' ' + c : '—';
  return '<div class="detail-card"><div class="detail-title">' + name + ' · ' + ticker + '</div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_qty') + '</span><span class="value">' + qty + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_price') + '</span><span class="value">' + curr + ' ' + c + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_avg_cost') + '</span><span class="value">' + cost + ' ' + c + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_value') + '</span><span class="value">' + valueStr + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_total_cost') + '</span><span class="value">' + costStr + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'label_unrealized_pl') + '</span><span class="value ' + plCls + '">' + plStr + ' (' + pctStr + ')</span></div></div>';
}

export function renderTradeTicket(tradeState, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const state = tradeState || {};
  const side = (state.side === 'SELL' || state.side === 'BUY') ? state.side : 'SELL';
  const orderType = state.orderType || 'MARKET';
  const quantity = state.quantity != null ? String(state.quantity) : '';
  const limitPrice = state.limitPrice != null ? String(state.limitPrice) : '';
  const stopPrice = state.stopPrice != null ? String(state.stopPrice) : '';
  const timeValidity = state.timeValidity === 'GOOD_TILL_CANCEL' ? 'GOOD_TILL_CANCEL' : 'DAY';
  const extendedHours = !!state.extendedHours;
  const submitting = !!state.submitting;
  const showLimit = orderType === 'LIMIT' || orderType === 'STOP_LIMIT';
  const showStop = orderType === 'STOP' || orderType === 'STOP_LIMIT';
  const showTimeValidity = orderType !== 'MARKET';
  const showExtendedHours = orderType === 'MARKET';
  const contextName = escHtml(state.contextName || '—');
  const contextTicker = escHtml(state.contextTicker || '—');
  const availableQty = state.availableQuantity != null ? String(state.availableQuantity) : '—';
  const actionText = submitting ? t(L, 'order_submitting') : t(L, 'order_submit');

  return '<div class="detail-card trade-ticket">' +
    '<div class="detail-title">' + t(L, 'trade_title') + '</div>' +
    '<div class="trade-context">' +
    '<span class="trade-context-name">' + contextName + '</span>' +
    '<span class="trade-context-ticker">' + contextTicker + '</span>' +
    '<span class="trade-context-qty">' + t(L, 'trade_available_qty') + ' ' + escHtml(availableQty) + '</span>' +
    '</div>' +
    '<div class="trade-grid">' +
    '<label class="trade-field"><span class="label">' + t(L, 'trade_side') + '</span>' +
    '<select id="tradeSideSelect" class="analysis-select">' +
    '<option value="BUY"' + (side === 'BUY' ? ' selected' : '') + '>' + t(L, 'order_side_buy') + '</option>' +
    '<option value="SELL"' + (side === 'SELL' ? ' selected' : '') + '>' + t(L, 'order_side_sell') + '</option>' +
    '</select></label>' +
    '<label class="trade-field"><span class="label">' + t(L, 'trade_order_type') + '</span>' +
    '<select id="tradeOrderTypeSelect" class="analysis-select">' +
    '<option value="MARKET"' + (orderType === 'MARKET' ? ' selected' : '') + '>' + t(L, 'order_type_market') + '</option>' +
    '<option value="LIMIT"' + (orderType === 'LIMIT' ? ' selected' : '') + '>' + t(L, 'order_type_limit') + '</option>' +
    '<option value="STOP"' + (orderType === 'STOP' ? ' selected' : '') + '>' + t(L, 'order_type_stop') + '</option>' +
    '<option value="STOP_LIMIT"' + (orderType === 'STOP_LIMIT' ? ' selected' : '') + '>' + t(L, 'order_type_stop_limit') + '</option>' +
    '</select></label>' +
    '<label class="trade-field"><span class="label">' + t(L, 'trade_quantity') + '</span>' +
    '<input id="tradeQuantityInput" class="analysis-select" type="number" min="0.00000001" step="any" value="' + escHtml(quantity) + '" /></label>' +
    (showLimit ? '<label class="trade-field"><span class="label">' + t(L, 'trade_limit_price') + '</span>' +
      '<input id="tradeLimitPriceInput" class="analysis-select" type="number" min="0.00000001" step="any" value="' + escHtml(limitPrice) + '" /></label>' : '') +
    (showStop ? '<label class="trade-field"><span class="label">' + t(L, 'trade_stop_price') + '</span>' +
      '<input id="tradeStopPriceInput" class="analysis-select" type="number" min="0.00000001" step="any" value="' + escHtml(stopPrice) + '" /></label>' : '') +
    (showTimeValidity
      ? '<label class="trade-field"><span class="label">' + t(L, 'trade_time_validity') + '</span>' +
        '<select id="tradeTimeValiditySelect" class="analysis-select">' +
        '<option value="DAY"' + (timeValidity === 'DAY' ? ' selected' : '') + '>DAY</option>' +
        '<option value="GOOD_TILL_CANCEL"' + (timeValidity === 'GOOD_TILL_CANCEL' ? ' selected' : '') + '>GOOD_TILL_CANCEL</option>' +
        '</select></label>'
      : '') +
    (showExtendedHours
      ? '<label class="trade-field trade-checkbox"><span class="label">' + t(L, 'trade_extended_hours') + '</span>' +
        '<input id="tradeExtendedHoursInput" type="checkbox"' + (extendedHours ? ' checked' : '') + ' /></label>'
      : '') +
    '</div>' +
    '<div class="trade-actions">' +
    '<button type="button" id="tradeSubmitBtn" class="primary"' + (submitting ? ' disabled' : '') + '>' + actionText + '</button>' +
    '</div>' +
    (state.error ? '<div class="trade-error">' + escHtml(state.error) + '</div>' : '') +
    (state.success ? '<div class="trade-success">' + escHtml(state.success) + '</div>' : '') +
    '</div>';
}

export function renderOrderConfirm(tradeState, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const state = tradeState || {};
  const side = (state.side === 'SELL' || state.side === 'BUY') ? state.side : 'BUY';
  const orderType = state.orderType || 'MARKET';
  const qty = state.quantity != null ? Number(state.quantity) : NaN;
  const qtyText = Number.isFinite(qty) ? String(qty) : '—';
  const limitText = state.limitPrice != null ? fmtNum(state.limitPrice) : '—';
  const stopText = state.stopPrice != null ? fmtNum(state.stopPrice) : '—';
  const validityText = state.timeValidity || 'DAY';
  const extendedHoursText = state.extendedHours ? t(L, 'yes') : t(L, 'no');

  return '<div class="trade-confirm">' +
    '<div class="trade-confirm-title">' + t(L, 'order_confirm_title') + '</div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'trade_side') + '</span><span class="value">' + sideLabel(side, L) + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'trade_order_type') + '</span><span class="value">' + orderTypeLabel(orderType, L) + '</span></div>' +
    '<div class="detail-row"><span class="label">' + t(L, 'trade_quantity') + '</span><span class="value">' + escHtml(qtyText) + '</span></div>' +
    (orderType === 'LIMIT' || orderType === 'STOP_LIMIT'
      ? '<div class="detail-row"><span class="label">' + t(L, 'trade_limit_price') + '</span><span class="value">' + escHtml(limitText) + '</span></div>'
      : '') +
    (orderType === 'STOP' || orderType === 'STOP_LIMIT'
      ? '<div class="detail-row"><span class="label">' + t(L, 'trade_stop_price') + '</span><span class="value">' + escHtml(stopText) + '</span></div>'
      : '') +
    (orderType !== 'MARKET'
      ? '<div class="detail-row"><span class="label">' + t(L, 'trade_time_validity') + '</span><span class="value">' + escHtml(validityText) + '</span></div>'
      : '<div class="detail-row"><span class="label">' + t(L, 'trade_extended_hours') + '</span><span class="value">' + escHtml(extendedHoursText) + '</span></div>') +
    '<div class="trade-confirm-actions">' +
    '<button type="button" id="tradeConfirmCancel" class="secondary">' + t(L, 'order_confirm_cancel') + '</button>' +
    '<button type="button" id="tradeConfirmSubmit" class="primary">' + t(L, 'order_confirm_submit') + '</button>' +
    '</div>' +
    '</div>';
}

export function renderPendingOrders(orders, lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  const list = Array.isArray(orders) ? orders : [];
  if (list.length === 0) {
    return '<div class="detail-card trade-pending"><div class="detail-title">' + t(L, 'pending_orders_title') + '</div><div class="hint-text">' + t(L, 'pending_orders_empty') + '</div></div>';
  }
  const rows = list.map(order => {
    const id = order && order.id != null ? String(order.id) : '';
    const type = orderTypeLabel(order && order.type, L);
    const side = sideLabel(order && order.side, L);
    const qty = order && order.quantity != null ? String(Math.abs(Number(order.quantity))) : '—';
    const limitPrice = order && order.limitPrice != null ? fmtNum(order.limitPrice) : '';
    const stopPrice = order && order.stopPrice != null ? fmtNum(order.stopPrice) : '';
    const timeInForce = order && order.timeInForce ? String(order.timeInForce) : '';
    const pricePieces = [];
    if (limitPrice) pricePieces.push(t(L, 'trade_limit_price') + ' ' + limitPrice);
    if (stopPrice) pricePieces.push(t(L, 'trade_stop_price') + ' ' + stopPrice);
    if (timeInForce) pricePieces.push(timeInForce);
    return '<div class="trade-pending-item">' +
      '<div class="trade-pending-main">' +
      '<div class="trade-pending-line"><span class="value">' + escHtml(side + ' · ' + type) + '</span><span class="value">' + t(L, 'trade_quantity') + ' ' + escHtml(qty) + '</span></div>' +
      '<div class="trade-pending-line"><span class="label">#' + escHtml(id) + '</span><span class="label">' + escHtml(pricePieces.join(' · ')) + '</span></div>' +
      '</div>' +
      '<button type="button" class="secondary trade-cancel-btn" data-order-id="' + escHtml(id) + '">' + t(L, 'pending_cancel') + '</button>' +
      '</div>';
  }).join('');
  return '<div class="detail-card trade-pending"><div class="detail-title">' + t(L, 'pending_orders_title') + '</div>' + rows + '</div>';
}
