# T212 Agent Chrome Web Store 提交清单

## 已完成（本地）
- [x] `manifest.json` 版本号升级到 `1.2.1`
- [x] 可上传包已生成：`/Users/judyzhu/Desktop/TradingAgent/release/t212-agent-v1.2.1.zip`
- [x] ZIP 结构校验通过（根目录直接包含 `manifest.json`）
- [x] ZIP 校验和（SHA-256）：`7343dac2d62d471734ab5570a0d350c3b162247ea170c100c83b51d7aa9dac9d`

## 你需要在 Google 账号里完成（我无法代操作）
- [ ] Chrome Web Store 开发者注册并支付一次性注册费（USD 5）
- [ ] Google 账号开启两步验证

## 开发者后台操作顺序
1. 打开 Chrome Web Store Developer Dashboard
2. `Add new item` 上传：
   - `/Users/judyzhu/Desktop/TradingAgent/release/t212-agent-v1.2.1.zip`
3. 按以下文档填写：
   - Listing：`/Users/judyzhu/Desktop/TradingAgent/release/WEBSTORE_LISTING_TEXT.md`
   - Privacy：`/Users/judyzhu/Desktop/TradingAgent/release/PRIVACY_PRACTICES_NOTES.md`
   - 隐私政策正文（如需 URL）：`/Users/judyzhu/Desktop/TradingAgent/release/PRIVACY_POLICY_TEMPLATE.md`
4. Distribution 先选 `Unlisted`（建议内测）
5. 点击 `Submit for Review`

## 提交前自查（强烈建议）
- [ ] 至少上传 1 张截图（建议 1280x800 或 640x400）
- [ ] Store Icon / Tile image 尺寸符合要求
- [ ] Listing 描述与实际功能一致（账户总览、侧边栏、Watchlist 搜索加入）
- [ ] 对权限用途说明清楚（特别是 `host_permissions`）
- [ ] 若后台要求隐私政策 URL，先把模板发布到可公开访问的网址（例如 GitHub Pages）

## 风险提醒
- 当前扩展包含 `<all_urls>` 与广泛 content script 匹配，审核时可能被重点问询。
- 如遇到权限质询，需在说明中明确：
  - 仅用于在当前页面显示悬浮面板
  - 不采集网页内容，不上传用户浏览数据
