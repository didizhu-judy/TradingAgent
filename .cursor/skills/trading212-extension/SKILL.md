---
name: trading212-extension
description: Implements the Trading 212 Chrome extension for viewing portfolio, positions, and P&L without opening the app. Use when building or completing the Trading 212 行情助手 extension per PLAN.md and 可行性说明.md.
---

# Trading 212 Chrome 扩展实现

## 必读文档

实现前必须阅读工作区根目录的：
- [PLAN.md](../../../PLAN.md) — 目标、形态、API、功能范围、实现步骤
- [可行性说明.md](../../../可行性说明.md) — API 确认、凭证方式、数据流、最终形态

## 项目结构

```
TradingAgent/
├── extension/           # Chrome 扩展 (Manifest V3)
│   ├── manifest.json
│   ├── popup.html, popup.js, popup.css
│   ├── options.html, options.js
│   ├── api.js          # Trading 212 API 封装
│   └── icons/          # icon16.png, icon32.png, icon48.png
├── proxy/              # 可选：本地代理 (CORS 时使用)
│   ├── app.py
│   └── requirements.txt
└── README.md           # 安装、配置、获取 API Key 说明
```

## 实现检查清单

### 1. 扩展基础

- **manifest.json**：manifest_version 3；permissions: storage；host_permissions 包含 `https://live.trading212.com/*`、`https://demo.trading212.com/*`、`http://127.0.0.1:8765/*`；action.default_popup: popup.html；options_page: options.html；icons 指向 icons/。
- **options 页**：表单字段 — API Key、API Secret、环境(Demo/Live)、是否使用本地代理、代理 URL(默认 http://127.0.0.1:8765)。保存到 `chrome.storage.local`；页面加载时从 storage 回填。
- **popup 页**：占位结构 — 账户总览区、持仓列表区、刷新按钮；未配置时提示「请在选项中配置 API」；加载中/错误状态文案。

### 2. API 层 (extension/api.js)

- 从 `chrome.storage.local` 读取 apiKey、apiSecret、environment、useProxy、proxyUrl。
- 直连：请求 `https://live.trading212.com/api/v0` 或 `https://demo.trading212.com/api/v0` + path，Header: `Authorization: Basic base64(apiKey:apiSecret)`。
- 代理：请求 `proxyUrl + path`，path 为 `/api/v0/equity/account/summary` 或 `/api/v0/equity/positions`（代理端需转发到 Trading 212 并附加认证）。
- 封装：getAccountSummary()、getPositions()；统一错误处理并抛出可读错误。
- Popup 中若使用 ES module，需 `<script type="module" src="popup.js">`，且 api 通过 import 或 popup 内非 module 脚本用全局函数访问（二选一，保持一致）。

### 3. 弹窗 UI 与数据

- **账户总览**：展示 totalValue、cash.availableToTrade、investments.currentValue、investments.unrealizedProfitLoss、investments.realizedProfitLoss、currency（字段以 Trading 212 API 返回为准）。
- **持仓列表**：每项展示 instrument.name、instrument.ticker、quantity、currentPrice、averagePricePaid、walletImpact.unrealizedProfitLoss、以及盈亏百分比（可计算）。
- 刷新按钮：点击后重新请求 getAccountSummary + getPositions 并更新 DOM。
- 可选：自动刷新间隔（如 30s），注意 API 限频（positions 约 1 次/秒）。

### 4. 本地代理 (proxy/)

- **app.py**：Flask 或 FastAPI；监听 127.0.0.1:8765；从环境变量或 .env 读取 API_KEY、API_SECRET、ENVIRONMENT；将请求转发到 `https://live.trading212.com/api/v0` 或 demo，并添加 HTTP Basic 认证；路径与扩展请求一致（如 `/api/v0/equity/account/summary`）。
- **requirements.txt**：flask 或 fastapi + uvicorn 等依赖。

### 5. 图标与 README

- **icons**：若缺失，可提供 16/32/48 的占位 PNG，或在 manifest 中临时移除 icon 引用并说明。
- **README.md**：如何获取 API Key（链接到 Trading 212 帮助中心）；如何加载未打包扩展（chrome://extensions 开发者模式）；如何配置选项；若遇 CORS 如何启动 proxy 并填写代理地址。

## API 参考要点

- 账户摘要：GET `/api/v0/equity/account/summary`。返回 cash、investments、totalValue、currency 等。
- 持仓：GET `/api/v0/equity/positions`。返回数组，每项含 instrument（name、ticker）、quantity、currentPrice、averagePricePaid、walletImpact（currentValue、totalCost、unrealizedProfitLoss）等。
- 认证：Header `Authorization: Basic base64(apiKey:apiSecret)`。

## 验收

- 在 Chrome 加载 extension 目录后，打开选项页保存 API Key/Secret 和环境；点击扩展图标弹出 popup，显示账户总览与持仓列表；刷新按钮可用；未配置时提示明确；README 具备安装与配置步骤。
