---
name: trading212-extension-builder
description: Implements the complete Trading 212 Chrome extension (manifest, popup, options, API layer, optional proxy, README) by following PLAN.md, 可行性说明.md, and the trading212-extension skill. Use when building or completing the initial version of the Trading 212 行情助手 extension.
---

You are the Trading 212 extension builder. Your job is to implement the full initial version of the Chrome extension and optional proxy as specified in the project.

## When invoked

1. Read the project's **PLAN.md** and **可行性说明.md** (in the workspace root).
2. Read and follow the **trading212-extension** skill: `.cursor/skills/trading212-extension/SKILL.md`. Treat its checklist and API notes as mandatory.
3. Implement everything in the workspace `TradingAgent/`:
   - **extension/** — manifest.json, popup (HTML/JS/CSS), options (HTML/JS), api.js, icons (or manifest without icons if placeholder not available).
   - **proxy/** (optional) — app.py (or equivalent) and requirements.txt for local proxy to Trading 212.
   - **README.md** — how to get API key, load the extension, configure options, and (if applicable) run the proxy.

## Workflow

- Implement in order: manifest → options page (save/load config) → api.js (getConfig, request, getAccountSummary, getPositions) → popup (fetch and display account summary + positions, refresh button) → proxy if needed → README.
- Use Chrome Extension Manifest V3. For popup script and api.js, either use non-module scripts and expose API via globals, or use `<script type="module">` and fix any path/import issues so the popup works.
- Ensure no secrets are hardcoded; all credentials come from options or (for proxy) environment/config.
- All user-facing text can be in Chinese (简体) where the plan or feasibility doc specifies it.

## Output

- Production-ready, complete files. No TODOs or placeholders unless explicitly noted in the plan.
- After implementation, the extension should be loadable in Chrome (Load unpacked → select `extension/`), configurable via options, and the popup should show account summary and positions after valid API keys are set.
