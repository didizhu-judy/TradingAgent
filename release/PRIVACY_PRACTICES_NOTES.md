# Privacy Practices 填写建议（Developer Dashboard）

以下是建议选择，最终请以你实际产品行为为准：

## Data collection
- Personal communications: No
- Health information: No
- Financial and payment information: No (unless你明确上传交易数据到你自己的服务器)
- Authentication information: Yes (API Key/Secret stored locally)
- Location: No
- Web history: No
- User activity: No
- Website content: No

## Data usage
- Extension functionality: Yes
- Analytics: No
- Personalization: No
- Advertising: No

## Data handling
- Data sold to third parties: No
- Data used for unrelated purposes: No
- Data transfer to third parties: No（默认场景）

## Security
- Data encrypted in transit: Yes（HTTPS API 请求）

## Justification text（可粘贴）
This extension stores API credentials and user settings locally in Chrome storage to fetch account and quote data for core functionality. It does not collect browsing history, does not read page content for analytics/advertising, and does not sell user data.
