# Trading 212 行情助手 — UI 与体验改进计划

## 1. 防 429（请求过于频繁）

- **问题**：连续点两次刷新会触发 API 限频 429，且会持续出现。
- **实现**：
  - **刷新节流**：1.5 秒内仅允许一次有效刷新，避免连点。
  - **429 专用处理**：捕获 `status === 429`，解析 `Retry-After`（若有），显示「请求过于频繁，请 X 秒后再试」，并在该时间内禁用刷新按钮，到期后自动恢复。
  - **API 层**：在 `api.js` 的 `request()` 中对非 2xx 响应附加 `err.status` 与 `err.retryAfter`，供 popup/panel 识别。
- **范围**：popup.js、panel.js、api.js。

---

## 2. UI 改版（量化科技风）

- **参考**：量化/金融科技类网页 — 深色、数据密度高、等宽数字、细分割线、偏专业感。
- **实现**：
  - **配色**：更深背景 `#0a0e14`，青/氰强调色 `#22d3ee`，绿/红盈亏 `#34d399` / `#f87171`。
  - **字体**：保留无衬线 + 等宽数字，增加 `font-variant-numeric: tabular-nums` 使数字对齐。
  - **圆角与间距**：略缩小圆角与内边距，更紧凑。
- **范围**：shared.css（:root 变量与基础组件）。

---

## 3. 透明度调节

- **需求**：用户可调节界面透明度。
- **实现**：
  - **选项页**：新增「界面透明度」滑块，范围 0.5～1，步长 0.05，旁边显示百分比。
  - **存储**：`chrome.storage.local` 的 `opacity`，默认 1。
  - **应用**：在 shared.css 中使用 `--app-opacity`，body 背景为 `rgba(var(--bg-primary-rgb), var(--app-opacity))`；popup/panel 在加载时通过 `getConfig()` 读取并设置 `document.documentElement.style.setProperty('--app-opacity', config.opacity)`。
- **范围**：options.html、options.js、api.js getConfig、shared.css、popup.js、panel.js。

---

## 4. 侧边栏宽度可调

- **需求**：侧边栏宽度可调节（Chrome 侧边栏由用户拖拽分隔条，此处指内容区最小宽度）。
- **实现**：
  - **选项页**：新增「侧边栏最小宽度」下拉，选项 320 / 400 / 480 / 560 px，默认 400。
  - **存储**：`sidePanelWidth` 字符串（如 `"400"`）。
  - **应用**：侧边栏采用纯 CSS 自适应布局（无固定最小宽度），随用户拖拽宽度自动重排（见 sidepanel.css 与 shared.css）。
- **范围**：options.html、options.js、api.js getConfig、sidepanel.css、panel.js。

---

## 5. 验收

- 连续快速点刷新：仅第一次请求发出，约 1.5 秒内再次点击无新请求；若触发 429，显示秒数并禁用刷新至倒计时结束。
- 选项页可设置透明度与侧边栏最小宽度，保存后 popup/侧边栏/悬浮窗应用新样式。
- 界面为深色量化风，数字对齐、配色统一。
