import { getAccountSummary, getPositions, getConfig, getCachedData, setCachedData, getRateLimitUntil, setRateLimitUntil, getMarketAnalysisFromConfig, getPromptForMiroMind, getWatchlistItems, getDefaultWatchlistItems, getDefaultWatchlistWithQuotes, enrichWatchlistItemsWithQuotes, getCustomWatchlistItems, addCustomWatchlistItem, getQuoteByTicker, placeMarketOrder, placeLimitOrder, placeStopOrder, placeStopLimitOrder, getPendingOrders, cancelPendingOrder } from './api.js';
import { t } from './i18n.js';
import { applyAppearance, getDefaultThemeForSkin, SKIN_PROFILES, normalizeWorkSkin, skinLabelKey, skinDescKey } from './appearance.js';
import {
  sortPositions,
  renderSummaryRows,
  renderCashRows,
  renderPositionsList,
  renderPositionDetail,
  renderQuoteResult,
  renderTradeTicket,
  renderOrderConfirm,
  renderPendingOrders,
  renderWatchlistList,
  renderWatchlistSearchResult
} from './app-core.js';

const el = {
  empty: document.getElementById('state-empty'),
  loading: document.getElementById('state-loading'),
  error: document.getElementById('state-error'),
  content: document.getElementById('content'),
  summaryRows: document.getElementById('summaryRows'),
  positionsList: document.getElementById('positionsList'),
  watchlistList: document.getElementById('watchlistList'),
  watchlistTickerInput: document.getElementById('watchlistTickerInput'),
  watchlistSearch: document.getElementById('watchlistSearch'),
  watchlistSearchResult: document.getElementById('watchlistSearchResult'),
  watchlistSearchError: document.getElementById('watchlistSearchError'),
  cashRows: document.getElementById('cashRows'),
  positionDetailContent: document.getElementById('positionDetailContent'),
  positionTradeTicket: document.getElementById('positionTradeTicket'),
  positionPendingOrders: document.getElementById('positionPendingOrders'),
  viewMain: document.getElementById('view-main'),
  viewWatchlist: document.getElementById('view-watchlist'),
  viewPositionDetail: document.getElementById('view-position-detail'),
  positionsSort: document.getElementById('positionsSort'),
  detailBack: document.getElementById('detailBack'),
  lastUpdatedStatus: document.getElementById('lastUpdatedStatus'),
  lastUpdatedStatusAnalysis: document.getElementById('lastUpdatedStatusAnalysis'),
  refresh: document.getElementById('refresh'),
  openOptions: document.getElementById('openOptions'),
  statusBarOptions: document.getElementById('statusBarOptions'),
  statusBarSidePanel: document.getElementById('statusBarSidePanel'),
  themeToggle: document.getElementById('themeToggle'),
  btnSkinMenu: document.getElementById('btnSkinMenu'),
  skinMenu: document.getElementById('skinMenu'),
  codeWorkbenchMenu: document.getElementById('codeWorkbenchMenu'),
  headerActions: document.querySelector('.header-actions'),
  workSkinTabs: document.getElementById('workSkinTabs'),
  workSkinRibbon: document.getElementById('workSkinRibbon'),
  soulCursor: document.getElementById('soulCursor'),
  viewAnalysis: document.getElementById('view-analysis'),
  analysisGenerate: document.getElementById('analysisGenerate'),
  analysisError: document.getElementById('analysisError'),
  analysisResult: document.getElementById('analysisResult'),
  analysisBack: document.getElementById('analysisBack'),
  watchlistBack: document.getElementById('watchlistBack'),
  viewSwitchTabs: document.getElementById('viewSwitchTabs'),
  btnOverview: document.getElementById('btnOverview'),
  btnAnalysis: document.getElementById('btnAnalysis'),
  btnWatchlist: document.getElementById('btnWatchlist'),
  statusBarOptionsFromAnalysis: document.getElementById('statusBarOptionsFromAnalysis'),
  statusBarSidePanelFromAnalysis: document.getElementById('statusBarSidePanelFromAnalysis'),
  analysisModelSelect: document.getElementById('analysisModelSelect'),
  analysisLanguageSelect: document.getElementById('analysisLanguageSelect'),
  analysisCopyAndOpenMiroMind: document.getElementById('analysisCopyAndOpenMiroMind'),
  analysisMiroMindStatus: document.getElementById('analysisMiroMindStatus'),
  analysisPromptInput: document.getElementById('analysisPromptInput'),
  analysisResetPrompt: document.getElementById('analysisResetPrompt'),
  analysisCopyPrompt: document.getElementById('analysisCopyPrompt'),
  analysisPromptStatus: document.getElementById('analysisPromptStatus'),
  analysisPromptEditableHint: document.getElementById('analysisPromptEditableHint'),
  analysisOpenMiroMindSite: document.getElementById('analysisOpenMiroMindSite'),
  analysisOpenChatGPTSite: document.getElementById('analysisOpenChatGPTSite'),
  analysisOpenPerplexitySite: document.getElementById('analysisOpenPerplexitySite')
};

const SKIN_IDS = SKIN_PROFILES.map(profile => profile.id);
const SLIDES_SCENE_IDS = new Set(['overview', 'pnl', 'cash', 'positions']);

const CODE_WORKBENCH_ITEMS = [
  { id: 'file', labelKey: 'vscode_menu_file' },
  { id: 'edit', labelKey: 'vscode_menu_edit' },
  { id: 'view', labelKey: 'vscode_menu_view' },
  { id: 'go', labelKey: 'vscode_menu_go' },
  { id: 'run', labelKey: 'vscode_menu_run' },
  { id: 'terminal', labelKey: 'vscode_menu_terminal' },
  { id: 'help', labelKey: 'vscode_menu_help' }
];

function label(zh, en) {
  return { zh, en };
}

function textForLang(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return lang === 'en' ? value.en : value.zh;
}

const WORK_SKIN_CHROME = {
  code: {
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: label('overview.md', 'overview.md'), closable: true },
      { id: 'watchlist', label: label('watchlist.md', 'watchlist.md'), closable: true },
      { id: 'analysis', label: label('analysis.md', 'analysis.md'), closable: true }
    ],
    ribbon: {
      overview: [],
      watchlist: [],
      analysis: []
    }
  },
  doc: {
    defaultTab: 'home',
    tabs: [
      { id: 'file', label: label('文件', 'File'), tone: 'accent' },
      { id: 'home', label: label('主页', 'Home') },
      { id: 'insert', label: label('插入', 'Insert') },
      { id: 'layout', label: label('布局', 'Layout') },
      { id: 'references', label: label('引用', 'References') },
      { id: 'review', label: label('审阅', 'Review') },
      { id: 'view', label: label('视图', 'View') }
    ],
    ribbon: {
      file: [
        { title: label('开始', 'Start'), lead: label('新建', 'New'), items: [label('打开', 'Open'), label('共享', 'Share')] },
        { title: label('文档', 'Document'), items: [label('信息', 'Info'), label('打印', 'Print'), label('导出', 'Export')] },
        { title: label('帐户', 'Account'), items: [label('主题', 'Theme'), label('首选项', 'Options')] }
      ],
      home: [
        { title: label('剪贴板', 'Clipboard'), lead: label('粘贴', 'Paste'), items: [label('剪切', 'Cut'), label('复制', 'Copy')] },
        { title: label('字体', 'Font'), lead: label('Aptos 11', 'Aptos 11'), items: [label('加粗', 'Bold'), label('斜体', 'Italic'), label('颜色', 'Color')] },
        { title: label('段落', 'Paragraph'), items: [label('项目符号', 'Bullets'), label('对齐', 'Align'), label('行距', 'Spacing')] },
        { title: label('样式', 'Styles'), items: [label('正文', 'Normal'), label('标题 1', 'Heading 1'), label('标题 2', 'Heading 2')] },
        { title: label('编辑', 'Editing'), items: [label('查找', 'Find'), label('替换', 'Replace')] }
      ],
      insert: [
        { title: label('页面', 'Pages'), lead: label('封面', 'Cover'), items: [label('空白页', 'Blank'), label('分页符', 'Break')] },
        { title: label('插图', 'Illustrations'), items: [label('图片', 'Pictures'), label('形状', 'Shapes'), label('图标', 'Icons')] },
        { title: label('链接', 'Links'), items: [label('超链接', 'Link'), label('书签', 'Bookmark')] },
        { title: label('页眉页脚', 'Header & Footer'), items: [label('页码', 'Page Number'), label('页脚', 'Footer')] }
      ],
      layout: [
        { title: label('页面设置', 'Page Setup'), lead: label('页边距', 'Margins'), items: [label('方向', 'Orientation'), label('纸张', 'Size')] },
        { title: label('段落', 'Paragraph'), items: [label('缩进', 'Indent'), label('间距', 'Spacing')] },
        { title: label('排列', 'Arrange'), items: [label('位置', 'Position'), label('环绕', 'Wrap')] }
      ],
      references: [
        { title: label('目录', 'Table of Contents'), lead: label('目录', 'Contents'), items: [label('添加文本', 'Add Text')] },
        { title: label('脚注', 'Footnotes'), items: [label('插入', 'Insert'), label('下一个', 'Next')] },
        { title: label('引文', 'Citations'), items: [label('插入引文', 'Insert Citation'), label('样式', 'Style')] }
      ],
      review: [
        { title: label('校对', 'Proofing'), lead: label('拼写', 'Spelling'), items: [label('同义词', 'Thesaurus'), label('字数', 'Word Count')] },
        { title: label('批注', 'Comments'), items: [label('新建', 'New'), label('删除', 'Delete')] },
        { title: label('修订', 'Tracking'), items: [label('修订', 'Track Changes'), label('显示标记', 'Markup')] }
      ],
      view: [
        { title: label('视图', 'Views'), lead: label('打印布局', 'Print Layout'), items: [label('阅读模式', 'Read Mode')] },
        { title: label('缩放', 'Zoom'), items: [label('100%', '100%'), label('单页', 'One Page')] },
        { title: label('窗口', 'Window'), items: [label('并排查看', 'Side by Side'), label('拆分', 'Split')] }
      ]
    }
  },
  sheet: {
    defaultTab: 'home',
    tabs: [
      { id: 'file', label: label('文件', 'File'), tone: 'accent' },
      { id: 'home', label: label('开始', 'Home') },
      { id: 'insert', label: label('插入', 'Insert') },
      { id: 'layout', label: label('页面布局', 'Page Layout') },
      { id: 'formulas', label: label('公式', 'Formulas') },
      { id: 'data', label: label('数据', 'Data') },
      { id: 'view', label: label('视图', 'View') }
    ],
    ribbon: {
      file: [
        { title: label('开始', 'Start'), lead: label('新建', 'New'), items: [label('打开', 'Open'), label('共享', 'Share')] },
        { title: label('工作簿', 'Workbook'), items: [label('信息', 'Info'), label('打印', 'Print'), label('导出', 'Export')] },
        { title: label('帐户', 'Account'), items: [label('更新', 'Updates'), label('首选项', 'Options')] }
      ],
      home: [
        { title: label('剪贴板', 'Clipboard'), lead: label('粘贴', 'Paste'), items: [label('剪切', 'Cut'), label('复制', 'Copy')] },
        { title: label('字体', 'Font'), lead: label('Aptos 11', 'Aptos 11'), items: [label('加粗', 'Bold'), label('边框', 'Borders'), label('填充', 'Fill')] },
        { title: label('对齐', 'Alignment'), items: [label('左对齐', 'Left'), label('居中', 'Center'), label('换行', 'Wrap')] },
        { title: label('数字', 'Number'), items: [label('常规', 'General'), label('货币', 'Currency'), label('百分比', 'Percent')] },
        { title: label('编辑', 'Editing'), items: [label('排序', 'Sort'), label('筛选', 'Filter'), label('自动求和', 'AutoSum')] }
      ],
      insert: [
        { title: label('表格', 'Tables'), lead: label('表格', 'Table'), items: [label('数据透视表', 'PivotTable')] },
        { title: label('插图', 'Illustrations'), items: [label('图片', 'Pictures'), label('形状', 'Shapes')] },
        { title: label('图表', 'Charts'), items: [label('柱形图', 'Column'), label('折线图', 'Line'), label('饼图', 'Pie')] }
      ],
      layout: [
        { title: label('主题', 'Themes'), lead: label('主题', 'Themes'), items: [label('颜色', 'Colors'), label('字体', 'Fonts')] },
        { title: label('页面设置', 'Page Setup'), items: [label('页边距', 'Margins'), label('方向', 'Orientation'), label('大小', 'Size')] },
        { title: label('缩放', 'Scale to Fit'), items: [label('宽度', 'Width'), label('高度', 'Height')] }
      ],
      formulas: [
        { title: label('函数库', 'Function Library'), lead: label('fx', 'fx'), items: [label('最近使用', 'Recent'), label('财务', 'Financial')] },
        { title: label('定义名称', 'Defined Names'), items: [label('名称管理器', 'Name Manager'), label('定义名称', 'Define Name')] },
        { title: label('公式审核', 'Formula Auditing'), items: [label('追踪引用', 'Trace'), label('错误检查', 'Error Check')] }
      ],
      data: [
        { title: label('获取数据', 'Get Data'), lead: label('刷新', 'Refresh'), items: [label('连接', 'Connections')] },
        { title: label('排序筛选', 'Sort & Filter'), items: [label('排序 A-Z', 'Sort A-Z'), label('筛选', 'Filter')] },
        { title: label('数据工具', 'Data Tools'), items: [label('分列', 'Text to Columns'), label('验证', 'Validation')] }
      ],
      view: [
        { title: label('工作簿视图', 'Workbook Views'), lead: label('普通', 'Normal'), items: [label('分页预览', 'Page Break')] },
        { title: label('显示', 'Show'), items: [label('网格线', 'Gridlines'), label('编辑栏', 'Formula Bar')] },
        { title: label('窗口', 'Window'), items: [label('冻结窗格', 'Freeze Panes'), label('拆分', 'Split')] }
      ]
    }
  },
  slides: {
    defaultTab: 'home',
    tabs: [
      { id: 'file', label: label('文件', 'File'), tone: 'accent' },
      { id: 'home', label: label('主页', 'Home') },
      { id: 'insert', label: label('插入', 'Insert') },
      { id: 'design', label: label('设计', 'Design') },
      { id: 'transitions', label: label('切换', 'Transitions') },
      { id: 'animations', label: label('动画', 'Animations') },
      { id: 'view', label: label('视图', 'View') }
    ],
    ribbon: {
      file: [
        { title: label('开始', 'Start'), lead: label('新建', 'New'), items: [label('打开', 'Open'), label('共享', 'Share')] },
        { title: label('演示文稿', 'Presentation'), items: [label('信息', 'Info'), label('打印', 'Print'), label('导出', 'Export')] },
        { title: label('帐户', 'Account'), items: [label('主题', 'Theme'), label('首选项', 'Options')] }
      ],
      home: [
        { title: label('剪贴板', 'Clipboard'), lead: label('粘贴', 'Paste'), items: [label('剪切', 'Cut'), label('复制', 'Copy')] },
        { title: label('幻灯片', 'Slides'), lead: label('新建幻灯片', 'New Slide'), items: [label('版式', 'Layout'), label('重置', 'Reset')] },
        { title: label('字体', 'Font'), lead: label('Aptos 18', 'Aptos 18'), items: [label('加粗', 'Bold'), label('斜体', 'Italic')] },
        { title: label('段落', 'Paragraph'), items: [label('项目符号', 'Bullets'), label('居中', 'Center'), label('行距', 'Spacing')] },
        { title: label('绘图', 'Drawing'), items: [label('形状', 'Shapes'), label('排列', 'Arrange')] }
      ],
      insert: [
        { title: label('表格', 'Tables'), lead: label('表格', 'Table'), items: [label('图表', 'Chart')] },
        { title: label('图像', 'Images'), items: [label('图片', 'Pictures'), label('图标', 'Icons')] },
        { title: label('文本', 'Text'), items: [label('文本框', 'Text Box'), label('页眉页脚', 'Header')] }
      ],
      design: [
        { title: label('主题', 'Themes'), lead: label('主题', 'Themes'), items: [label('变体', 'Variants')] },
        { title: label('设计器', 'Designer'), items: [label('建议', 'Ideas'), label('背景', 'Format Background')] },
        { title: label('幻灯片大小', 'Slide Size'), items: [label('宽屏', 'Widescreen'), label('标准', 'Standard')] }
      ],
      transitions: [
        { title: label('预览', 'Preview'), lead: label('预览', 'Preview'), items: [label('应用', 'Apply')] },
        { title: label('切换到此幻灯片', 'Transition to This Slide'), items: [label('淡化', 'Fade'), label('推入', 'Push')] },
        { title: label('计时', 'Timing'), items: [label('持续时间', 'Duration'), label('声音', 'Sound')] }
      ],
      animations: [
        { title: label('预览', 'Preview'), lead: label('预览', 'Preview'), items: [label('播放', 'Play')] },
        { title: label('动画', 'Animations'), items: [label('出现', 'Appear'), label('强调', 'Emphasis'), label('退出', 'Exit')] },
        { title: label('高级动画', 'Advanced'), items: [label('动画窗格', 'Pane'), label('触发器', 'Trigger')] }
      ],
      view: [
        { title: label('演示文稿视图', 'Presentation Views'), lead: label('普通', 'Normal'), items: [label('阅读', 'Reading'), label('备注页', 'Notes')] },
        { title: label('母版视图', 'Master Views'), items: [label('幻灯片母版', 'Slide Master')] },
        { title: label('缩放', 'Zoom'), items: [label('适应窗口', 'Fit to Window')] }
      ]
    }
  },
  mail: {
    defaultTab: 'home',
    tabs: [
      { id: 'home', label: label('主页', 'Home'), tone: 'accent' },
      { id: 'send', label: label('发送/接收', 'Send/Receive') },
      { id: 'folder', label: label('文件夹', 'Folder') },
      { id: 'view', label: label('视图', 'View') },
      { id: 'help', label: label('帮助', 'Help') }
    ],
    ribbon: {
      home: [
        { title: label('新建', 'New'), lead: label('新邮件', 'New Mail'), items: [label('会议', 'Meeting'), label('项目', 'Items')] },
        { title: label('响应', 'Respond'), items: [label('回复', 'Reply'), label('全部回复', 'Reply All'), label('转发', 'Forward')] },
        { title: label('快速步骤', 'Quick Steps'), items: [label('归档', 'Archive'), label('分类', 'Categorize')] },
        { title: label('标记', 'Tags'), items: [label('标记', 'Flag'), label('已完成', 'Done')] }
      ],
      send: [
        { title: label('发送/接收', 'Send/Receive'), lead: label('全部发送', 'Send All'), items: [label('更新文件夹', 'Update Folder')] },
        { title: label('下载', 'Download'), items: [label('标头', 'Headers'), label('共享邮件', 'Shared Folders')] },
        { title: label('首选项', 'Preferences'), items: [label('脱机工作', 'Work Offline')] }
      ],
      folder: [
        { title: label('新建', 'New'), lead: label('新文件夹', 'New Folder'), items: [label('搜索文件夹', 'Search Folder')] },
        { title: label('清理', 'Clean Up'), items: [label('忽略', 'Ignore'), label('删除', 'Delete')] },
        { title: label('收藏夹', 'Favorites'), items: [label('置顶', 'Pin'), label('显示', 'Show')] }
      ],
      view: [
        { title: label('布局', 'Layout'), lead: label('紧凑', 'Compact'), items: [label('单行', 'Single'), label('预览', 'Message Preview')] },
        { title: label('当前视图', 'Current View'), items: [label('更改视图', 'Change View'), label('重置视图', 'Reset View')] },
        { title: label('窗口', 'Window'), items: [label('阅读窗格', 'Reading Pane'), label('待办栏', 'To-Do Bar')] }
      ],
      help: [
        { title: label('帮助', 'Help'), lead: label('帮助', 'Help'), items: [label('培训', 'Training'), label('反馈', 'Feedback')] },
        { title: label('支持', 'Support'), items: [label('诊断', 'Diagnostics'), label('联系支持', 'Contact Support')] }
      ]
    }
  }
};

const SLIDES_SCENES = [
  { id: 'overview', titleKey: 'slides_thumb_overview', subtitleKey: 'overview_title' },
  { id: 'pnl', titleKey: 'slides_thumb_pnl', subtitleKey: 'slides_scene_title_pnl' },
  { id: 'cash', titleKey: 'slides_thumb_cash', subtitleKey: 'slides_scene_title_cash' },
  { id: 'positions', titleKey: 'slides_thumb_positions', subtitleKey: 'slides_scene_title_positions' }
];

const CODE_LINE_BASE_COUNT = 120;
const CODE_LINE_HEIGHT_PX = 22;
const CODE_VIEW_BY_TAB = {
  overview: 'main',
  watchlist: 'watchlist',
  analysis: 'analysis'
};
const CODE_TAB_BY_VIEW = {
  main: 'overview',
  watchlist: 'watchlist',
  analysis: 'analysis'
};

const SHEET_RAIL_LINES = Array.from({ length: 60 }, (_, i) => String(i + 1));
const WATCHLIST_SNAPSHOT_KEY = 't212_watchlist_snapshot';

const MAIL_FOLDERS = [
  label('收件箱', 'Inbox'),
  label('已标记', 'Flagged'),
  label('草稿箱', 'Drafts'),
  label('日历', 'Calendar'),
  label('任务', 'Tasks')
];

let state = {
  summary: null,
  positions: [],
  watchlist: [],
  watchlistLastUpdated: 0,
  watchlistError: '',
  watchlistSearchQuote: null,
  cash: null,
  sortKey: 'value',
  lastUpdated: 0,
  currency: '',
  autoRefreshSeconds: 0,
  currentDetailIndex: null,
  detailFromWatchlist: false,
  detailWatchlistQuote: null,
  detailTicker: '',
  detailName: '',
  detailAvailableQuantity: null,
  detailReturnView: 'main',
  pendingOrders: [],
  pendingLoading: false,
  tradeDraft: null,
  tradeConfirmDraft: null,
  lang: 'zh',
  workSkin: 'code',
  slidesScene: 'overview',
  activeChromeTabBySkin: {}
};

function normalizeSlidesScene(value) {
  const id = String(value || '').trim().toLowerCase();
  return SLIDES_SCENE_IDS.has(id) ? id : 'overview';
}

function getEffectiveSortKey() {
  const skin = normalizeWorkSkin(state.workSkin);
  if (skin === 'slides' && normalizeSlidesScene(state.slidesScene) === 'pnl') return 'pl';
  return state.sortKey;
}

function getCurrentViewName() {
  if (el.viewPositionDetail && el.viewPositionDetail.classList.contains('active')) return 'detail';
  if (el.viewWatchlist && el.viewWatchlist.classList.contains('active')) return 'watchlist';
  if (el.viewAnalysis && el.viewAnalysis.classList.contains('active')) return 'analysis';
  return 'main';
}

function applyTheme(config) {
  if (!config) return;
  const resolved = applyAppearance(config);
  state.workSkin = resolved.workSkin;
  const theme = resolved.theme;
  const lang = config.language === 'en' ? 'en' : 'zh';
  if (el.themeToggle) el.themeToggle.title = theme === 'light' ? t(lang, 'theme_switch_dark') : t(lang, 'theme_switch_light');
  if (el.btnSkinMenu) el.btnSkinMenu.title = t(lang, skinLabelKey(resolved.workSkin));
  if (resolved.workSkin === 'code') syncCodeTabWithView(getCurrentViewName());
  updateSkinMenuSelection();
  renderHeaderChrome();
  syncMainEditorRails();
  applySlidesSceneLayout();
  syncHeaderViewSwitch(getCurrentViewName());
}

function applyI18n(lang) {
  const L = lang === 'en' ? 'en' : 'zh';
  document.documentElement.lang = L === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (key) node.textContent = t(L, key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key) node.setAttribute('placeholder', t(L, key));
  });
  syncDetailBackLabel();
  if (el.viewPositionDetail && el.viewPositionDetail.classList.contains('active')) {
    renderTradeSection();
  }
  renderSkinMenu();
  renderHeaderChrome();
  syncMainEditorRails();
  applySlidesSceneLayout();
  syncHeaderViewSwitch(getCurrentViewName());
}

function updateSkinMenuSelection() {
  if (!el.skinMenu) return;
  const current = normalizeWorkSkin(state.workSkin);
  el.skinMenu.querySelectorAll('.skin-option').forEach(node => {
    node.classList.toggle('active', node.getAttribute('data-skin-option') === current);
  });
}

function renderSkinMenu() {
  if (!el.skinMenu) return;
  const L = state.lang === 'en' ? 'en' : 'zh';
  const current = normalizeWorkSkin(state.workSkin);
  el.skinMenu.innerHTML = '';
  const frag = document.createDocumentFragment();
  SKIN_IDS.forEach(id => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skin-option' + (id === current ? ' active' : '');
    btn.setAttribute('data-skin-option', id);
    const name = document.createElement('span');
    name.className = 'skin-option-name';
    name.textContent = t(L, skinLabelKey(id));
    const desc = document.createElement('span');
    desc.className = 'skin-option-desc';
    desc.textContent = t(L, skinDescKey(id));
    btn.appendChild(name);
    btn.appendChild(desc);
    frag.appendChild(btn);
  });
  el.skinMenu.appendChild(frag);
}

function renderCodeWorkbenchMenu() {
  if (!el.codeWorkbenchMenu) return;
  const L = state.lang === 'en' ? 'en' : 'zh';
  el.codeWorkbenchMenu.innerHTML = '';
  const frag = document.createDocumentFragment();
  CODE_WORKBENCH_ITEMS.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-workbench-item';
    btn.setAttribute('data-workbench-action', item.id);
    btn.textContent = t(L, item.labelKey);
    frag.appendChild(btn);
  });
  el.codeWorkbenchMenu.appendChild(frag);
}

function getWorkSkinChromeConfig() {
  const skin = normalizeWorkSkin(state.workSkin);
  return WORK_SKIN_CHROME[skin] || null;
}

function getActiveWorkSkinTabId(config = getWorkSkinChromeConfig()) {
  if (!config || !Array.isArray(config.tabs) || config.tabs.length === 0) return '';
  const skin = normalizeWorkSkin(state.workSkin);
  const current = state.activeChromeTabBySkin[skin];
  if (config.tabs.some(tab => tab.id === current)) return current;
  return config.defaultTab || config.tabs[0].id;
}

function getResponsiveRibbonGroups(groups) {
  const list = Array.isArray(groups) ? groups : [];
  const width = Math.max(
    document.documentElement ? document.documentElement.clientWidth || 0 : 0,
    typeof window !== 'undefined' ? window.innerWidth || 0 : 0
  );

  let maxGroups = list.length;
  let maxItems = 2;
  let keepLead = true;
  if (width <= 440) {
    maxGroups = 2;
    maxItems = 1;
    keepLead = false;
  } else if (width <= 620) {
    maxGroups = 3;
    maxItems = 2;
    keepLead = false;
  } else if (width <= 860) {
    maxGroups = 4;
    maxItems = 2;
  }

  return list.slice(0, maxGroups).map(group => ({
    ...group,
    lead: keepLead ? group.lead : null,
    items: Array.isArray(group.items) ? group.items.slice(0, maxItems) : []
  }));
}

function mergeWatchlistQuotesFromPrevious(nextList, previousList) {
  const next = Array.isArray(nextList) ? nextList : [];
  const prev = Array.isArray(previousList) ? previousList : [];
  if (!next.length || !prev.length) return next;
  const prevMap = new Map(prev.map(item => [tickerKey(item && (item.ticker || item.symbol)), item]));
  return next.map(item => {
    const key = tickerKey(item && (item.ticker || item.symbol));
    if (!key) return item;
    const oldItem = prevMap.get(key);
    if (!oldItem) return item;
    const out = { ...item };
    if (out.price == null && oldItem.price != null) out.price = oldItem.price;
    if (out.change == null && oldItem.change != null) out.change = oldItem.change;
    if (out.changePct == null && oldItem.changePct != null) out.changePct = oldItem.changePct;
    return out;
  });
}

function hasWatchlistQuote(item) {
  if (!item || typeof item !== 'object') return false;
  const price = Number(item.price);
  const change = Number(item.change);
  const changePct = Number(item.changePct);
  return Number.isFinite(price) || Number.isFinite(change) || Number.isFinite(changePct);
}

async function getWatchlistSnapshot() {
  try {
    const r = await chrome.storage.local.get(WATCHLIST_SNAPSHOT_KEY);
    const list = Array.isArray(r[WATCHLIST_SNAPSHOT_KEY]) ? r[WATCHLIST_SNAPSHOT_KEY] : [];
    return list
      .map(item => {
        const ticker = tickerKey(item && (item.ticker || item.symbol));
        if (!ticker) return null;
        return {
          ticker,
          name: item && item.name ? String(item.name) : ticker,
          price: item && item.price != null ? Number(item.price) : null,
          change: item && item.change != null ? Number(item.change) : null,
          changePct: item && item.changePct != null ? Number(item.changePct) : null
        };
      })
      .filter(item => item && item.ticker);
  } catch (_) {
    return [];
  }
}

async function setWatchlistSnapshot(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return;
  try {
    const cleaned = list
      .map(item => {
        const ticker = tickerKey(item && (item.ticker || item.symbol));
        if (!ticker) return null;
        return {
          ticker,
          name: item && item.name ? String(item.name) : ticker,
          price: item && item.price != null ? Number(item.price) : null,
          change: item && item.change != null ? Number(item.change) : null,
          changePct: item && item.changePct != null ? Number(item.changePct) : null
        };
      })
      .filter(item => item && item.ticker);
    if (!cleaned.length) return;
    await chrome.storage.local.set({ [WATCHLIST_SNAPSHOT_KEY]: cleaned.slice(0, 300) });
  } catch (_) {}
}

function renderWorkSkinChrome() {
  if (!el.workSkinTabs || !el.workSkinRibbon) return;
  const config = getWorkSkinChromeConfig();
  const lang = state.lang === 'en' ? 'en' : 'zh';

  if (!config) {
    el.workSkinTabs.innerHTML = '';
    el.workSkinRibbon.innerHTML = '';
    placeHeaderViewSwitch();
    return;
  }

  const activeTabId = getActiveWorkSkinTabId(config);
  state.activeChromeTabBySkin[normalizeWorkSkin(state.workSkin)] = activeTabId;

  el.workSkinTabs.innerHTML = '';
  const tabsFrag = document.createDocumentFragment();
  config.tabs.forEach(tab => {
    const btn = document.createElement('button');
    const tabLabel = textForLang(tab.label, lang);
    btn.type = 'button';
    btn.className = 'work-skin-tab' + (tab.id === activeTabId ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
    btn.setAttribute('data-work-skin-tab', tab.id);
    btn.setAttribute('aria-label', tabLabel);
    if (tab.tone) btn.setAttribute('data-tone', tab.tone);
    if (tab.closable) {
      const labelNode = document.createElement('span');
      labelNode.className = 'work-skin-tab-label';
      labelNode.textContent = tabLabel;
      const closeNode = document.createElement('span');
      closeNode.className = 'work-skin-tab-close';
      closeNode.setAttribute('aria-hidden', 'true');
      closeNode.textContent = '×';
      btn.appendChild(labelNode);
      btn.appendChild(closeNode);
    } else {
      btn.textContent = tabLabel;
    }
    tabsFrag.appendChild(btn);
  });
  el.workSkinTabs.appendChild(tabsFrag);

  const skin = normalizeWorkSkin(state.workSkin);
  const groupsRaw = skin === 'code'
    ? (config.ribbon[activeTabId] || config.ribbon[config.defaultTab] || [])
    : [];
  const groups = getResponsiveRibbonGroups(groupsRaw);
  el.workSkinRibbon.innerHTML = '';
  const ribbonFrag = document.createDocumentFragment();
  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'work-skin-group';

    const body = document.createElement('div');
    body.className = 'work-skin-group-body';

    if (group.lead) {
      const lead = document.createElement('span');
      lead.className = 'work-skin-group-lead';
      lead.textContent = textForLang(group.lead, lang);
      body.appendChild(lead);
    }

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'work-skin-group-items';
    (group.items || []).forEach(item => {
      const chip = document.createElement('span');
      chip.className = 'work-skin-group-chip';
      chip.textContent = textForLang(item, lang);
      itemsWrap.appendChild(chip);
    });
    body.appendChild(itemsWrap);

    const title = document.createElement('span');
    title.className = 'work-skin-group-title';
    title.textContent = textForLang(group.title, lang);

    section.appendChild(body);
    section.appendChild(title);
    ribbonFrag.appendChild(section);
  });
  el.workSkinRibbon.appendChild(ribbonFrag);
  placeHeaderViewSwitch();
}

function renderHeaderChrome() {
  renderCodeWorkbenchMenu();
  renderWorkSkinChrome();
  updateSoulCursor();
}

function placeHeaderViewSwitch() {
  if (!el.viewSwitchTabs) return;
  const skin = normalizeWorkSkin(state.workSkin);
  if (skin !== 'code' && el.workSkinRibbon) {
    if (el.viewSwitchTabs.parentElement !== el.workSkinRibbon) {
      el.workSkinRibbon.prepend(el.viewSwitchTabs);
    }
    el.viewSwitchTabs.classList.add('in-ribbon');
    return;
  }
  if (el.headerActions && el.viewSwitchTabs.parentElement !== el.headerActions) {
    el.headerActions.appendChild(el.viewSwitchTabs);
  }
  el.viewSwitchTabs.classList.remove('in-ribbon');
}

function setActiveWorkSkinTab(tabId) {
  const config = getWorkSkinChromeConfig();
  if (!config || !config.tabs.some(tab => tab.id === tabId)) return;
  const skin = normalizeWorkSkin(state.workSkin);
  if (skin !== 'code') return;
  const isSameTab = state.activeChromeTabBySkin[skin] === tabId;
  state.activeChromeTabBySkin[skin] = tabId;
  if (!isSameTab) renderWorkSkinChrome();
  if (skin === 'code') {
    const nextView = CODE_VIEW_BY_TAB[tabId] || 'main';
    showView(nextView, { fromCodeTab: true });
  }
}

function syncCodeTabWithView(viewName) {
  if (normalizeWorkSkin(state.workSkin) !== 'code') return;
  const tabId = CODE_TAB_BY_VIEW[viewName] || 'overview';
  if (state.activeChromeTabBySkin.code === tabId) return;
  state.activeChromeTabBySkin.code = tabId;
  renderWorkSkinChrome();
}

function syncHeaderViewSwitch(viewName) {
  const skin = normalizeWorkSkin(state.workSkin);
  const effectiveView = viewName === 'detail'
    ? (state.detailReturnView === 'watchlist' ? 'watchlist' : 'main')
    : viewName;
  const controls = [
    ['main', el.btnOverview],
    ['watchlist', el.btnWatchlist],
    ['analysis', el.btnAnalysis]
  ];
  controls.forEach(([id, node]) => {
    if (!node) return;
    const active = (effectiveView || 'main') === id;
    node.classList.toggle('active', active);
    node.setAttribute('aria-selected', active ? 'true' : 'false');
    node.setAttribute('tabindex', active ? '0' : '-1');
  });
  if (el.viewSwitchTabs) {
    el.viewSwitchTabs.classList.toggle('is-code', skin === 'code');
  }
}

function updateSoulCursor() {
  if (!el.soulCursor) return;
  const skin = normalizeWorkSkin(state.workSkin);
  const colorMap = {
    doc: '#185abd',
    sheet: '#107c41',
    slides: '#c94b31',
    mail: '#4e78a6'
  };
  const glyphMap = {
    doc: '|',
    sheet: '|',
    slides: '|',
    mail: '|'
  };
  el.soulCursor.textContent = glyphMap[skin] || '|';
  if (skin === 'code') {
    el.soulCursor.style.left = '';
    el.soulCursor.style.top = '';
    el.soulCursor.style.right = '8px';
    el.soulCursor.style.color = '';
    return;
  }
  const header = document.querySelector('.app-header');
  const title = header ? header.querySelector('h1') : null;
  if (!header || !title) return;
  const headerRect = header.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, Math.round(titleRect.right - headerRect.left + 4)),
    Math.max(8, Math.round(headerRect.width - 18))
  );
  const top = Math.max(4, Math.round(titleRect.top - headerRect.top + 1));
  el.soulCursor.style.left = `${left}px`;
  el.soulCursor.style.right = 'auto';
  el.soulCursor.style.top = `${top}px`;
  el.soulCursor.style.color = colorMap[skin] || '';
}

function getMainEditorContent() {
  const mainView = el.viewMain;
  return mainView ? mainView.querySelector('.editor-content') : null;
}

function getAllEditorContents() {
  return [el.viewMain, el.viewWatchlist, el.viewAnalysis]
    .map(view => (view ? view.querySelector('.editor-content') : null))
    .filter(Boolean);
}

function ensureCodeLineRail(editor = getMainEditorContent()) {
  if (!editor) return null;
  let rail = editor.querySelector('.code-line-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.className = 'code-line-rail';
    rail.setAttribute('aria-hidden', 'true');
    editor.prepend(rail);
  }
  return rail;
}

function renderCodeLineRail() {
  const editor = getMainEditorContent();
  const rail = ensureCodeLineRail(editor);
  if (!rail || !editor) return;
  const contentNodes = Array.from(editor.children).filter(node => {
    if (!(node instanceof HTMLElement)) return false;
    return !node.classList.contains('code-line-rail')
      && !node.classList.contains('sheet-row-rail')
      && !node.classList.contains('mail-folder-rail')
      && !node.classList.contains('slides-thumb-rail');
  });
  let contentBottom = 0;
  contentNodes.forEach(node => {
    const bottom = node.offsetTop + node.offsetHeight;
    if (bottom > contentBottom) contentBottom = bottom;
  });
  const measuredHeight = Math.max(editor.clientHeight, contentBottom);
  const dynamicCount = Math.ceil(measuredHeight / CODE_LINE_HEIGHT_PX) + 10;
  const lineCount = Math.max(CODE_LINE_BASE_COUNT, dynamicCount);
  rail.textContent = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n');
}

function renderCodeLineRailForEditor(editor) {
  if (!editor) return;
  const rail = ensureCodeLineRail(editor);
  if (!rail) return;
  const contentNodes = Array.from(editor.children).filter(node => {
    if (!(node instanceof HTMLElement)) return false;
    return !node.classList.contains('code-line-rail')
      && !node.classList.contains('sheet-row-rail')
      && !node.classList.contains('mail-folder-rail')
      && !node.classList.contains('slides-thumb-rail');
  });
  let contentBottom = 0;
  contentNodes.forEach(node => {
    const bottom = node.offsetTop + node.offsetHeight;
    if (bottom > contentBottom) contentBottom = bottom;
  });
  const measuredHeight = Math.max(editor.clientHeight, contentBottom);
  const dynamicCount = Math.ceil(measuredHeight / CODE_LINE_HEIGHT_PX) + 10;
  const lineCount = Math.max(CODE_LINE_BASE_COUNT, dynamicCount);
  rail.textContent = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n');
}

function ensureSheetRowRail(editor = getMainEditorContent()) {
  if (!editor) return null;
  let rail = editor.querySelector('.sheet-row-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.className = 'sheet-row-rail';
    rail.setAttribute('aria-hidden', 'true');
    editor.prepend(rail);
  }
  return rail;
}

function renderSheetRowRail() {
  const rail = ensureSheetRowRail(getMainEditorContent());
  if (!rail) return;
  rail.textContent = SHEET_RAIL_LINES.join('\n');
}

function ensureMailFolderRail(editor = getMainEditorContent()) {
  if (!editor) return null;
  let rail = editor.querySelector('.mail-folder-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.className = 'mail-folder-rail';
    rail.setAttribute('aria-hidden', 'true');
    editor.prepend(rail);
  }
  return rail;
}

function renderMailFolderRail() {
  const rail = ensureMailFolderRail(getMainEditorContent());
  if (!rail) return;
  const lang = state.lang === 'en' ? 'en' : 'zh';
  rail.textContent = MAIL_FOLDERS.map(item => textForLang(item, lang)).join('\n');
}

function renderStaticSlidesThumbRail(editor) {
  if (!editor) return;
  let rail = editor.querySelector('.slides-thumb-rail');
  if (!rail) {
    rail = document.createElement('div');
    rail.className = 'slides-thumb-rail';
    rail.setAttribute('data-slides-static', '1');
    editor.prepend(rail);
  }
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '';
  const L = state.lang === 'en' ? 'en' : 'zh';
  const current = normalizeSlidesScene(state.slidesScene);
  const frag = document.createDocumentFragment();
  SLIDES_SCENES.forEach(scene => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slides-thumb-btn' + (scene.id === current ? ' active' : '');
    btn.setAttribute('tabindex', '-1');
    const title = document.createElement('span');
    title.className = 'slides-thumb-title';
    title.textContent = t(L, scene.titleKey);
    const subtitle = document.createElement('span');
    subtitle.className = 'slides-thumb-subtitle';
    subtitle.textContent = t(L, scene.subtitleKey);
    btn.appendChild(title);
    btn.appendChild(subtitle);
    frag.appendChild(btn);
  });
  rail.appendChild(frag);
}

function syncMainEditorRails() {
  const skin = normalizeWorkSkin(state.workSkin);
  const needsLeftRail = skin === 'code' || skin === 'sheet' || skin === 'slides' || skin === 'mail';
  const mainEditor = getMainEditorContent();
  getAllEditorContents().forEach(editor => {
    const isMain = editor === mainEditor;
    editor.classList.toggle('skin-has-left-rail', needsLeftRail);

    if (skin === 'code') {
      renderCodeLineRailForEditor(editor);
    } else {
      editor.querySelectorAll('.code-line-rail').forEach(node => node.remove());
    }

    if (skin === 'sheet') {
      const rail = ensureSheetRowRail(editor);
      if (rail) rail.textContent = SHEET_RAIL_LINES.join('\n');
    } else {
      editor.querySelectorAll('.sheet-row-rail').forEach(node => node.remove());
    }

    if (skin === 'mail') {
      const rail = ensureMailFolderRail(editor);
      if (rail) {
        const lang = state.lang === 'en' ? 'en' : 'zh';
        rail.textContent = MAIL_FOLDERS.map(item => textForLang(item, lang)).join('\n');
      }
    } else {
      editor.querySelectorAll('.mail-folder-rail').forEach(node => node.remove());
    }

    if (skin === 'slides') {
      if (isMain) {
        const staticRail = editor.querySelector('.slides-thumb-rail[data-slides-static="1"]');
        if (staticRail) staticRail.remove();
        ensureSlidesThumbRail();
      } else {
        renderStaticSlidesThumbRail(editor);
      }
    } else {
      editor.querySelectorAll('.slides-thumb-rail').forEach(node => node.remove());
    }
  });
}

function getSlidesMainNodes() {
  const mainView = el.viewMain;
  if (!mainView) {
    return {
      editor: null,
      rail: null,
      summarySection: null,
      summaryTitle: null,
      cashSection: null,
      cashTitle: null,
      positionsToolbar: null,
      positionsTitle: null,
      positionsList: null
    };
  }
  const editor = mainView.querySelector('.editor-content');
  const summarySection = mainView.querySelector('.summary-section');
  const cashSection = el.cashRows ? el.cashRows.closest('.section') : null;
  const positionsToolbar = mainView.querySelector('.positions-toolbar');
  return {
    editor,
    rail: editor ? editor.querySelector('.slides-thumb-rail') : null,
    summarySection,
    summaryTitle: summarySection ? summarySection.querySelector('.section-title') : null,
    cashSection,
    cashTitle: cashSection ? cashSection.querySelector('.section-title') : null,
    positionsToolbar,
    positionsTitle: positionsToolbar ? positionsToolbar.querySelector('.section-title') : null,
    positionsList: el.positionsList
  };
}

function ensureSlidesThumbRail() {
  const skin = normalizeWorkSkin(state.workSkin);
  const nodes = getSlidesMainNodes();
  if (!nodes.editor) return null;
  if (skin !== 'slides') {
    if (nodes.rail) nodes.rail.remove();
    return null;
  }
  let rail = nodes.rail;
  if (!rail) {
    rail = document.createElement('div');
    rail.className = 'slides-thumb-rail';
    rail.setAttribute('role', 'tablist');
    rail.setAttribute('aria-label', 'Slides scenes');
    rail.addEventListener('click', e => {
      const target = e.target instanceof Element ? e.target : null;
      const btn = target && target.closest ? target.closest('[data-slides-scene]') : null;
      if (!btn || !rail.contains(btn)) return;
      const scene = btn.getAttribute('data-slides-scene');
      if (!scene) return;
      setSlidesScene(scene);
    });
    nodes.editor.prepend(rail);
  }
  return rail;
}

function renderSlidesThumbRail() {
  const rail = ensureSlidesThumbRail();
  if (!rail) return;
  const L = state.lang === 'en' ? 'en' : 'zh';
  const current = normalizeSlidesScene(state.slidesScene);
  rail.innerHTML = '';
  const frag = document.createDocumentFragment();
  SLIDES_SCENES.forEach(scene => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slides-thumb-btn' + (scene.id === current ? ' active' : '');
    btn.setAttribute('data-slides-scene', scene.id);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', scene.id === current ? 'true' : 'false');
    const title = document.createElement('span');
    title.className = 'slides-thumb-title';
    title.textContent = t(L, scene.titleKey);
    const subtitle = document.createElement('span');
    subtitle.className = 'slides-thumb-subtitle';
    subtitle.textContent = t(L, scene.subtitleKey);
    btn.appendChild(title);
    btn.appendChild(subtitle);
    frag.appendChild(btn);
  });
  rail.appendChild(frag);
}

function applySlidesSceneLayout() {
  const nodes = getSlidesMainNodes();
  if (!nodes.editor) return;
  const skin = normalizeWorkSkin(state.workSkin);
  const scene = normalizeSlidesScene(state.slidesScene);
  const L = state.lang === 'en' ? 'en' : 'zh';
  const toggleSceneNode = (node, visible) => {
    if (!node) return;
    node.classList.toggle('slides-scene-hidden', !visible);
  };

  if (skin !== 'slides') {
    toggleSceneNode(nodes.summarySection, true);
    toggleSceneNode(nodes.cashSection, true);
    toggleSceneNode(nodes.positionsToolbar, true);
    toggleSceneNode(nodes.positionsList, true);
    if (el.summaryRows) {
      el.summaryRows.querySelectorAll('.summary-row').forEach(row => row.classList.remove('slides-scene-hidden'));
    }
    if (nodes.summaryTitle) nodes.summaryTitle.textContent = t(L, 'overview_title');
    if (nodes.cashTitle) nodes.cashTitle.textContent = t(L, 'cash_title');
    if (nodes.positionsTitle) nodes.positionsTitle.textContent = t(L, 'positions_title');
    if (el.positionsSort) {
      el.positionsSort.disabled = false;
      el.positionsSort.value = state.sortKey;
      el.positionsSort.removeAttribute('title');
    }
    return;
  }

  renderSlidesThumbRail();
  toggleSceneNode(nodes.summarySection, scene === 'overview' || scene === 'pnl');
  toggleSceneNode(nodes.cashSection, scene === 'overview' || scene === 'cash');
  toggleSceneNode(nodes.positionsToolbar, true);
  toggleSceneNode(nodes.positionsList, true);

  if (el.summaryRows) {
    const onlyPnLRows = scene === 'pnl';
    el.summaryRows.querySelectorAll('.summary-row').forEach((row, idx) => {
      row.classList.toggle('slides-scene-hidden', onlyPnLRows && idx < 3);
    });
  }

  if (nodes.summaryTitle) {
    nodes.summaryTitle.textContent = scene === 'pnl' ? t(L, 'slides_scene_title_pnl') : t(L, 'overview_title');
  }
  if (nodes.cashTitle) {
    nodes.cashTitle.textContent = scene === 'cash' ? t(L, 'slides_scene_title_cash') : t(L, 'cash_title');
  }
  if (nodes.positionsTitle) {
    nodes.positionsTitle.textContent = scene === 'positions' ? t(L, 'slides_scene_title_positions') : t(L, 'positions_title');
  }

  if (el.positionsSort) {
    if (scene === 'pnl') {
      el.positionsSort.disabled = true;
      el.positionsSort.value = 'pl';
      el.positionsSort.title = t(L, 'slides_scene_title_pnl');
    } else {
      el.positionsSort.disabled = false;
      el.positionsSort.value = state.sortKey;
      el.positionsSort.removeAttribute('title');
    }
  }
}

function setSlidesScene(sceneId) {
  const next = normalizeSlidesScene(sceneId);
  if (next === state.slidesScene) return;
  state.slidesScene = next;
  renderAll();
}

function focusFirstEditableControl() {
  const candidates = [
    el.analysisPromptInput,
    el.watchlistTickerInput
  ];
  for (const node of candidates) {
    if (!node || node.disabled) continue;
    if (node.offsetParent === null) continue;
    node.focus();
    if (typeof node.select === 'function') node.select();
    return true;
  }
  return false;
}

function handleCodeWorkbenchAction(actionId) {
  if (!actionId) return;
  if (actionId === 'file' || actionId === 'help') {
    return;
  }
  if (actionId === 'edit') {
    if (!focusFirstEditableControl() && el.positionsSort) el.positionsSort.focus();
    return;
  }
  if (actionId === 'view') {
    const order = ['main', 'watchlist', 'analysis'];
    const active = (el.viewWatchlist && el.viewWatchlist.classList.contains('active'))
      ? 'watchlist'
      : ((el.viewAnalysis && el.viewAnalysis.classList.contains('active')) ? 'analysis' : 'main');
    const idx = order.indexOf(active);
    const nextView = order[(idx + 1) % order.length];
    showView(nextView);
    return;
  }
  if (actionId === 'go') {
    if (!(el.viewMain && el.viewMain.classList.contains('active'))) {
      showView('main');
    }
    const target = el.viewMain ? el.viewMain.querySelector('.positions-toolbar') : null;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    return;
  }
  if (actionId === 'run') {
    load(true).catch(() => {});
    return;
  }
  if (actionId === 'terminal') {
    openSidePanelAndMaybeHideFloating();
    return;
  }
}

function updateSkinMenuWidth() {
  if (!el.skinMenu || !el.btnSkinMenu) return;
  const rootRect = document.documentElement.getBoundingClientRect();
  const btnRect = el.btnSkinMenu.getBoundingClientRect();
  const maxByViewport = Math.floor(btnRect.right - rootRect.left - 8);
  const maxWidth = Math.min(320, Math.floor(rootRect.width - 12), maxByViewport);
  if (!(maxWidth > 0)) return;
  const width = maxWidth >= 168 ? maxWidth : Math.max(120, maxWidth);
  el.skinMenu.style.width = `${Math.round(width)}px`;
}

function closeSkinMenu() {
  if (!el.skinMenu || !el.btnSkinMenu) return;
  el.skinMenu.classList.add('hidden');
  el.btnSkinMenu.setAttribute('aria-expanded', 'false');
}

function toggleSkinMenu() {
  if (!el.skinMenu || !el.btnSkinMenu) return;
  const willOpen = el.skinMenu.classList.contains('hidden');
  if (willOpen) {
    renderSkinMenu();
    updateSkinMenuWidth();
    el.skinMenu.classList.remove('hidden');
    el.btnSkinMenu.setAttribute('aria-expanded', 'true');
  } else {
    closeSkinMenu();
  }
}

async function setWorkSkin(nextSkin) {
  const normalized = normalizeWorkSkin(nextSkin);
  const meta = await chrome.storage.local.get(['workSkin', 'skinThemeMode', 'skinUsageStats', 'skinSwitchCount']);
  const prev = normalizeWorkSkin(meta.workSkin || state.workSkin);
  const patch = { workSkin: normalized };
  if ((meta.skinThemeMode || 'follow') === 'follow') {
    patch.theme = getDefaultThemeForSkin(normalized);
  }
  if (prev !== normalized) {
    const stats = (meta.skinUsageStats && typeof meta.skinUsageStats === 'object') ? { ...meta.skinUsageStats } : {};
    stats[normalized] = (Number(stats[normalized]) || 0) + 1;
    patch.skinUsageStats = stats;
    patch.skinSwitchCount = (Number(meta.skinSwitchCount) || 0) + 1;
    patch.skinLastSwitchedAt = Date.now();
  }
  await chrome.storage.local.set(patch);
  const config = await getConfig();
  state.lang = config.language === 'en' ? 'en' : 'zh';
  applyTheme(config);
  applyI18n(state.lang);
}

function formatLastUpdatedLabel(ms, autoRefreshSeconds) {
  if (!ms) return '';
  const d = new Date(ms);
  const locale = state.lang === 'en' ? 'en-GB' : 'zh-CN';
  let text = t(state.lang, 'last_updated') + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (autoRefreshSeconds > 0) text += ' · ' + autoRefreshSeconds + ' ' + t(state.lang, 'auto_refresh_in');
  return text;
}

function show(which) {
  if (el.empty) el.empty.classList.add('hidden');
  if (el.loading) el.loading.classList.add('hidden');
  if (el.error) el.error.classList.add('hidden');
  if (el.content) el.content.classList.add('hidden');
  if (which === 'empty' && el.empty) el.empty.classList.remove('hidden');
  else if (which === 'loading' && el.loading) el.loading.classList.remove('hidden');
  else if (which === 'error' && el.error) el.error.classList.remove('hidden');
  else if (which === 'content' && el.content) el.content.classList.remove('hidden');
}

function setError(msg) {
  const msgEl = document.getElementById('errorMessage');
  if (msgEl) {
    let str = '请求失败';
    if (msg != null && typeof msg === 'string') str = msg;
    else if (msg instanceof Error && msg.message) str = msg.message;
    else if (msg && typeof msg === 'object') {
      const m = msg.message ?? msg.error ?? msg.msg ?? msg.statusText ?? msg.reason;
      if (typeof m === 'string') str = m;
      else if (m && typeof m === 'object' && typeof m.message === 'string') str = m.message;
      else try { str = JSON.stringify(msg); } catch (_) { str = '请求失败'; }
    }
    msgEl.textContent = (typeof str === 'string' && str !== '[object Object]') ? str : '请求失败';
  }
  show('error');
}

function buildDefaultTradeDraft(side) {
  const detailQty = Number(state.detailAvailableQuantity);
  const hasDetailQty = Number.isFinite(detailQty) && detailQty > 0;
  const qty = side === 'SELL' && hasDetailQty ? detailQty : 1;
  return {
    phase: 'draft',
    side: side === 'BUY' ? 'BUY' : 'SELL',
    orderType: 'MARKET',
    quantity: String(qty),
    limitPrice: '',
    stopPrice: '',
    timeValidity: 'DAY',
    extendedHours: false,
    submitting: false,
    error: '',
    success: ''
  };
}

function syncDetailBackLabel() {
  if (!el.detailBack) return;
  const key = state.detailReturnView === 'watchlist' ? 'back_watchlist' : 'back_positions';
  el.detailBack.textContent = t(state.lang, key);
}

function getDetailFilteredPendingOrders(orders, ticker) {
  const key = tickerKey(ticker);
  if (!key) return [];
  return (Array.isArray(orders) ? orders : []).filter(order => tickerKey(order && order.ticker) === key);
}

function hasSellConflict(orders, ticker) {
  return getDetailFilteredPendingOrders(orders, ticker).some(order => String(order && order.side || '').toUpperCase() === 'SELL');
}

function readTradeDraftFromDom() {
  const draft = state.tradeDraft || buildDefaultTradeDraft('SELL');
  const sideSelect = document.getElementById('tradeSideSelect');
  const typeSelect = document.getElementById('tradeOrderTypeSelect');
  const qtyInput = document.getElementById('tradeQuantityInput');
  const limitInput = document.getElementById('tradeLimitPriceInput');
  const stopInput = document.getElementById('tradeStopPriceInput');
  const validitySelect = document.getElementById('tradeTimeValiditySelect');
  const extInput = document.getElementById('tradeExtendedHoursInput');
  if (sideSelect) draft.side = String(sideSelect.value || '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
  if (typeSelect) {
    const type = String(typeSelect.value || '').toUpperCase();
    draft.orderType = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(type) ? type : 'MARKET';
  }
  if (qtyInput) draft.quantity = qtyInput.value;
  if (limitInput) draft.limitPrice = limitInput.value;
  if (stopInput) draft.stopPrice = stopInput.value;
  if (validitySelect) draft.timeValidity = validitySelect.value === 'GOOD_TILL_CANCEL' ? 'GOOD_TILL_CANCEL' : 'DAY';
  if (extInput) draft.extendedHours = !!extInput.checked;
  state.tradeDraft = draft;
  return draft;
}

function validateTradeDraft() {
  const draft = readTradeDraftFromDom();
  if (!state.detailTicker) throw new Error(t(state.lang, 'trade_error_no_ticker'));
  const side = draft.side === 'SELL' ? 'SELL' : 'BUY';
  const orderType = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(draft.orderType) ? draft.orderType : 'MARKET';
  const quantity = Number(draft.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(t(state.lang, 'trade_error_quantity'));
  const detailQty = Number(state.detailAvailableQuantity);
  if (side === 'SELL' && Number.isFinite(detailQty) && detailQty > 0 && quantity > detailQty) {
    throw new Error(t(state.lang, 'trade_error_sell_exceeds').replace('%s', String(detailQty)));
  }
  const payload = {
    ticker: state.detailTicker,
    side,
    orderType,
    quantity
  };
  if (orderType === 'MARKET') {
    payload.extendedHours = !!draft.extendedHours;
  } else {
    payload.timeValidity = draft.timeValidity === 'GOOD_TILL_CANCEL' ? 'GOOD_TILL_CANCEL' : 'DAY';
  }
  if (orderType === 'LIMIT' || orderType === 'STOP_LIMIT') {
    const limitPrice = Number(draft.limitPrice);
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) throw new Error(t(state.lang, 'trade_error_limit_price'));
    payload.limitPrice = limitPrice;
  }
  if (orderType === 'STOP' || orderType === 'STOP_LIMIT') {
    const stopPrice = Number(draft.stopPrice);
    if (!Number.isFinite(stopPrice) || stopPrice <= 0) throw new Error(t(state.lang, 'trade_error_stop_price'));
    payload.stopPrice = stopPrice;
  }
  return payload;
}

async function refreshPendingOrdersForCurrentDetail(silent = false) {
  if (!state.detailTicker) {
    state.pendingOrders = [];
    state.pendingLoading = false;
    renderTradeSection();
    return;
  }
  if (!silent) {
    state.pendingLoading = true;
    renderTradeSection();
  }
  try {
    const allOrders = await getPendingOrders();
    state.pendingOrders = getDetailFilteredPendingOrders(allOrders, state.detailTicker);
  } catch (err) {
    if (!silent && state.tradeDraft) {
      state.tradeDraft.error = err && err.message ? err.message : t(state.lang, 'pending_load_error');
    }
  } finally {
    state.pendingLoading = false;
    renderTradeSection();
  }
}

async function submitTradeOrder() {
  if (!state.tradeConfirmDraft || !state.tradeDraft || state.tradeDraft.submitting) return;
  const payload = { ...state.tradeConfirmDraft };
  state.tradeDraft.submitting = true;
  state.tradeDraft.phase = 'submitting';
  state.tradeDraft.error = '';
  state.tradeDraft.success = '';
  renderTradeSection();
  try {
    const latestOrders = await getPendingOrders();
    state.pendingOrders = getDetailFilteredPendingOrders(latestOrders, state.detailTicker);
    if (payload.side === 'SELL' && hasSellConflict(latestOrders, payload.ticker)) {
      throw new Error(t(state.lang, 'trade_error_sell_conflict'));
    }
    let result = null;
    if (payload.orderType === 'LIMIT') {
      result = await placeLimitOrder(payload);
    } else if (payload.orderType === 'STOP') {
      result = await placeStopOrder(payload);
    } else if (payload.orderType === 'STOP_LIMIT') {
      result = await placeStopLimitOrder(payload);
    } else {
      result = await placeMarketOrder(payload);
    }
    const orderId = result && result.id != null ? String(result.id) : '';
    state.tradeDraft.phase = 'draft';
    state.tradeDraft.submitting = false;
    state.tradeDraft.error = '';
    state.tradeDraft.success = orderId
      ? t(state.lang, 'trade_submit_success').replace('%s', orderId)
      : t(state.lang, 'trade_submit_success_no_id');
    state.tradeConfirmDraft = null;
    await Promise.all([
      refreshPendingOrdersForCurrentDetail(true),
      load(true, true)
    ]);
    renderAll();
  } catch (err) {
    state.tradeDraft.phase = 'draft';
    state.tradeDraft.submitting = false;
    state.tradeDraft.error = err && err.message ? err.message : t(state.lang, 'trade_submit_failed');
    state.tradeDraft.success = '';
    state.tradeConfirmDraft = null;
    renderTradeSection();
  }
}

async function cancelPendingOrderById(orderId) {
  if (!orderId) return;
  if (state.tradeDraft) {
    state.tradeDraft.error = '';
    state.tradeDraft.success = '';
  }
  try {
    await cancelPendingOrder(orderId);
    if (state.tradeDraft) {
      state.tradeDraft.success = t(state.lang, 'pending_cancel_success').replace('%s', String(orderId));
    }
    await refreshPendingOrdersForCurrentDetail(true);
    renderTradeSection();
  } catch (err) {
    if (state.tradeDraft) {
      state.tradeDraft.error = err && err.message ? err.message : t(state.lang, 'pending_cancel_failed');
    }
    renderTradeSection();
  }
}

function bindTradeEvents() {
  const sideSelect = document.getElementById('tradeSideSelect');
  const typeSelect = document.getElementById('tradeOrderTypeSelect');
  const qtyInput = document.getElementById('tradeQuantityInput');
  const limitInput = document.getElementById('tradeLimitPriceInput');
  const stopInput = document.getElementById('tradeStopPriceInput');
  const validitySelect = document.getElementById('tradeTimeValiditySelect');
  const extInput = document.getElementById('tradeExtendedHoursInput');
  const submitBtn = document.getElementById('tradeSubmitBtn');
  const confirmCancelBtn = document.getElementById('tradeConfirmCancel');
  const confirmSubmitBtn = document.getElementById('tradeConfirmSubmit');
  const onDraftChange = (rerender = false) => {
    if (!state.tradeDraft) return;
    readTradeDraftFromDom();
    state.tradeDraft.phase = 'draft';
    state.tradeConfirmDraft = null;
    state.tradeDraft.error = '';
    state.tradeDraft.success = '';
    if (rerender) renderTradeSection();
  };
  if (sideSelect) sideSelect.addEventListener('change', () => onDraftChange(true));
  if (typeSelect) typeSelect.addEventListener('change', () => onDraftChange(true));
  if (qtyInput) qtyInput.addEventListener('input', () => onDraftChange(false));
  if (limitInput) limitInput.addEventListener('input', () => onDraftChange(false));
  if (stopInput) stopInput.addEventListener('input', () => onDraftChange(false));
  if (validitySelect) validitySelect.addEventListener('change', () => onDraftChange(false));
  if (extInput) extInput.addEventListener('change', () => onDraftChange(false));
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!state.tradeDraft || state.tradeDraft.submitting) return;
      try {
        const payload = validateTradeDraft();
        if (payload.side === 'SELL' && hasSellConflict(state.pendingOrders, payload.ticker)) {
          throw new Error(t(state.lang, 'trade_error_sell_conflict'));
        }
        state.tradeConfirmDraft = payload;
        state.tradeDraft.error = '';
        state.tradeDraft.success = '';
        state.tradeDraft.phase = 'confirm';
      } catch (err) {
        state.tradeDraft.error = err && err.message ? err.message : t(state.lang, 'trade_submit_failed');
        state.tradeDraft.phase = 'draft';
      }
      renderTradeSection();
    });
  }
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
      if (!state.tradeDraft) return;
      state.tradeConfirmDraft = null;
      state.tradeDraft.phase = 'draft';
      renderTradeSection();
    });
  }
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', () => {
      submitTradeOrder();
    });
  }
  document.querySelectorAll('.trade-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cancelPendingOrderById(btn.getAttribute('data-order-id'));
    });
  });
}

function renderTradeSection() {
  if (!el.positionTradeTicket || !el.positionPendingOrders || !state.detailTicker) return;
  const tradeViewState = {
    ...(state.tradeDraft || buildDefaultTradeDraft(state.detailFromWatchlist ? 'BUY' : 'SELL')),
    contextName: state.detailName,
    contextTicker: state.detailTicker,
    availableQuantity: state.detailAvailableQuantity
  };
  let ticketHtml = renderTradeTicket(tradeViewState, state.lang);
  if (state.tradeDraft && state.tradeDraft.phase === 'confirm' && state.tradeConfirmDraft) {
    ticketHtml += renderOrderConfirm(state.tradeConfirmDraft, state.lang);
  }
  el.positionTradeTicket.innerHTML = ticketHtml;
  if (state.pendingLoading) {
    el.positionPendingOrders.innerHTML = '<div class="detail-card trade-pending"><div class="detail-title">' + t(state.lang, 'pending_orders_title') + '</div><div class="hint-text">' + t(state.lang, 'pending_orders_loading') + '</div></div>';
  } else {
    el.positionPendingOrders.innerHTML = renderPendingOrders(state.pendingOrders, state.lang);
  }
  bindTradeEvents();
}

function showPositionDetail(index, options = {}) {
  state.currentDetailIndex = index;
  const sorted = sortPositions(state.positions, getEffectiveSortKey());
  const position = sorted[index];
  if (!position) return;
  state.detailFromWatchlist = false;
  state.detailWatchlistQuote = null;
  state.detailTicker = (position.instrument && position.instrument.ticker) || position.ticker || '';
  state.detailName = (position.instrument && position.instrument.name) || position.ticker || '—';
  state.detailAvailableQuantity = Number(position.quantity);
  if (!Number.isFinite(state.detailAvailableQuantity)) state.detailAvailableQuantity = null;
  state.detailReturnView = 'main';
  if (!options.preserveTrade || !state.tradeDraft) {
    state.tradeDraft = buildDefaultTradeDraft('SELL');
    state.tradeConfirmDraft = null;
  }
  if (!options.keepView) showView('detail');
  if (el.positionDetailContent) {
    el.positionDetailContent.innerHTML = renderPositionDetail(position, state.currency, state.lang);
  }
  syncDetailBackLabel();
  renderTradeSection();
  if (!options.preserveTrade) refreshPendingOrdersForCurrentDetail();
  if (el.detailBack) el.detailBack.focus();
}

function showWatchlistTradeDetail(quote, options = {}) {
  if (!quote) return;
  state.currentDetailIndex = null;
  state.detailFromWatchlist = true;
  state.detailWatchlistQuote = quote;
  state.detailTicker = String(quote.ticker || quote.symbol || '').trim().toUpperCase();
  state.detailName = quote.name || state.detailTicker || '—';
  const qtyNum = Number(quote.quantity);
  state.detailAvailableQuantity = (Number.isFinite(qtyNum) && qtyNum > 0) ? qtyNum : null;
  state.detailReturnView = 'watchlist';
  if (!options.preserveTrade || !state.tradeDraft) {
    state.tradeDraft = buildDefaultTradeDraft('BUY');
    state.tradeConfirmDraft = null;
  }
  if (!options.keepView) showView('detail');
  if (el.positionDetailContent) {
    el.positionDetailContent.innerHTML = renderQuoteResult(quote, state.lang);
  }
  syncDetailBackLabel();
  renderTradeSection();
  if (!options.preserveTrade) refreshPendingOrdersForCurrentDetail();
  if (el.detailBack) el.detailBack.focus();
}

function backFromDetail() {
  const backTo = state.detailReturnView === 'watchlist' ? 'watchlist' : 'main';
  showView(backTo);
}

function showView(name, options = {}) {
  if (el.viewMain) el.viewMain.classList.toggle('active', name === 'main');
  if (el.viewWatchlist) el.viewWatchlist.classList.toggle('active', name === 'watchlist');
  if (el.viewPositionDetail) el.viewPositionDetail.classList.toggle('active', name === 'detail');
  if (el.viewAnalysis) el.viewAnalysis.classList.toggle('active', name === 'analysis');
  if (!options.fromCodeTab && name !== 'detail') syncCodeTabWithView(name);
  syncHeaderViewSwitch(name);
  if (name === 'detail') syncDetailBackLabel();
  if (name === 'analysis') getConfig().then(c => {
    if (el.analysisModelSelect) el.analysisModelSelect.value = c.openRouterModel || '';
    if (el.analysisLanguageSelect) el.analysisLanguageSelect.value = c.analysisLanguage || 'follow';
    syncAnalysisPromptEditor(true, c);
  });
}

function getEffectiveAnalysisLang() {
  return (el.analysisLanguageSelect && el.analysisLanguageSelect.value !== 'follow') ? el.analysisLanguageSelect.value : state.lang;
}

function getDefaultAnalysisPrompt() {
  return getPromptForMiroMind(state.positions, state.summary, getEffectiveAnalysisLang());
}

async function syncAnalysisPromptEditor(forceOverwrite = false, config) {
  const cfg = config || await getConfig();
  const editable = !cfg.customAnalysisApiUrl;
  const defaultPrompt = getDefaultAnalysisPrompt();
  if (el.analysisPromptInput) {
    if (forceOverwrite || !el.analysisPromptInput.value.trim()) {
      el.analysisPromptInput.value = defaultPrompt;
    }
    el.analysisPromptInput.readOnly = !editable;
    el.analysisPromptInput.classList.toggle('readonly', !editable);
  }
  if (el.analysisPromptEditableHint) {
    el.analysisPromptEditableHint.textContent = t(state.lang, editable ? 'analysis_prompt_editable' : 'analysis_prompt_readonly');
  }
}

function tickerKey(value) {
  return String(value || '').trim().toUpperCase().split('_')[0];
}

function mergeWatchlistItems(primary, extra) {
  const out = [];
  const seen = new Set();
  [primary, extra].forEach(list => {
    (Array.isArray(list) ? list : []).forEach(item => {
      const key = tickerKey(item && (item.ticker || item.symbol));
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ ...item });
    });
  });
  return out;
}

function isTickerInWatchlist(ticker) {
  const key = tickerKey(ticker);
  if (!key) return false;
  return (state.watchlist || []).some(item => tickerKey(item && (item.ticker || item.symbol)) === key);
}

function quoteToWatchlistItem(quote) {
  return {
    ticker: tickerKey(quote && (quote.symbol || quote.ticker)),
    name: quote && quote.name ? quote.name : (quote && quote.ticker ? quote.ticker : '—'),
    price: quote && quote.currentPrice != null ? quote.currentPrice : null,
    change: quote && quote.change != null ? quote.change : null,
    changePct: quote && quote.changePct != null ? quote.changePct : null
  };
}

function renderWatchlistSearchCard() {
  if (!el.watchlistSearchResult) return;
  if (!state.watchlistSearchQuote) {
    el.watchlistSearchResult.classList.add('hidden');
    el.watchlistSearchResult.innerHTML = '';
    return;
  }
  const inWatchlist = isTickerInWatchlist(state.watchlistSearchQuote.ticker || state.watchlistSearchQuote.symbol);
  el.watchlistSearchResult.innerHTML = renderWatchlistSearchResult(state.watchlistSearchQuote, state.lang, inWatchlist);
  el.watchlistSearchResult.classList.remove('hidden');
  const addBtn = document.getElementById('watchlistAddFromSearch');
  if (addBtn) {
    addBtn.addEventListener('click', () => { addSearchedQuoteToWatchlist(); });
  }
  const tradeBtn = document.getElementById('watchlistTradeFromSearch');
  if (tradeBtn) {
    tradeBtn.addEventListener('click', () => { openTradeFromWatchlistSearch(); });
  }
}

function openTradeFromWatchlistSearch() {
  if (!state.watchlistSearchQuote) return;
  showWatchlistTradeDetail(state.watchlistSearchQuote);
}

function openTradeFromWatchlistItem(index) {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) return;
  const item = Array.isArray(state.watchlist) ? state.watchlist[idx] : null;
  if (!item) return;
  const ticker = String(item.ticker || item.symbol || '').trim().toUpperCase();
  if (!ticker) return;
  const tickerBase = tickerKey(ticker);
  const pos = (Array.isArray(state.positions) ? state.positions : []).find(p => {
    const posTicker = (p && p.instrument && p.instrument.ticker) || (p && p.ticker) || '';
    return tickerKey(posTicker) === tickerBase;
  });
  const posQtyNum = Number(pos && pos.quantity);
  const availableQty = (Number.isFinite(posQtyNum) && posQtyNum > 0) ? posQtyNum : null;
  showWatchlistTradeDetail({
    ticker,
    symbol: tickerKey(ticker),
    name: item.name || ticker,
    currentPrice: item.price != null ? item.price : null,
    change: item.change != null ? item.change : null,
    changePct: item.changePct != null ? item.changePct : null,
    quantity: availableQty
  });
}

async function addSearchedQuoteToWatchlist() {
  if (!state.watchlistSearchQuote) return;
  const item = quoteToWatchlistItem(state.watchlistSearchQuote);
  if (!item.ticker) return;
  if (isTickerInWatchlist(item.ticker)) {
    renderWatchlistSearchCard();
    return;
  }
  try {
    await addCustomWatchlistItem(item);
    state.watchlist = mergeWatchlistItems(state.watchlist, [item]);
    state.watchlist = await enrichWatchlistItemsWithQuotes(state.watchlist, true);
    renderAll();
  } catch (err) {
    if (el.watchlistSearchError) {
      el.watchlistSearchError.textContent = err && err.message ? err.message : '加入自选失败';
      el.watchlistSearchError.classList.remove('hidden');
    }
  }
}

async function searchWatchlistTicker() {
  const raw = el.watchlistTickerInput ? el.watchlistTickerInput.value.trim() : '';
  if (!raw) {
    if (el.watchlistSearchError) {
      el.watchlistSearchError.textContent = t(state.lang, 'quote_input_placeholder');
      el.watchlistSearchError.classList.remove('hidden');
    }
    if (el.watchlistSearchResult) {
      el.watchlistSearchResult.classList.add('hidden');
      el.watchlistSearchResult.innerHTML = '';
    }
    state.watchlistSearchQuote = null;
    return;
  }
  if (el.watchlistSearchError) el.watchlistSearchError.classList.add('hidden');
  if (el.watchlistSearchResult) el.watchlistSearchResult.classList.add('hidden');
  if (el.watchlistSearch) {
    el.watchlistSearch.disabled = true;
    el.watchlistSearch.textContent = t(state.lang, 'quote_searching');
  }
  try {
    state.watchlistSearchQuote = await getQuoteByTicker(raw);
    renderWatchlistSearchCard();
  } catch (err) {
    if (el.watchlistSearchError) {
      el.watchlistSearchError.textContent = err && err.message ? err.message : '查询失败';
      el.watchlistSearchError.classList.remove('hidden');
    }
    state.watchlistSearchQuote = null;
  } finally {
    if (el.watchlistSearch) {
      el.watchlistSearch.disabled = false;
      el.watchlistSearch.textContent = t(state.lang, 'quote_search');
    }
  }
}

function renderAll() {
  const effectiveSortKey = getEffectiveSortKey();
  if (state.summary && el.summaryRows) {
    el.summaryRows.innerHTML = renderSummaryRows(state.summary, state.lang);
  }
  if (state.summary && el.cashRows) {
    el.cashRows.innerHTML = renderCashRows(state.summary, state.lang);
  }
  if (el.positionsList) {
    el.positionsList.innerHTML = renderPositionsList(state.positions, effectiveSortKey, { clickable: true, lang: state.lang });
    el.positionsList.querySelectorAll('.position-card.clickable').forEach((card, i) => {
      card.addEventListener('click', () => {
        el.positionsList.querySelectorAll('.position-card.clickable').forEach((c, j) => c.classList.toggle('selected', j === i));
        showPositionDetail(i);
      });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
    });
  }
  if (el.watchlistList) {
    if (state.watchlistError) {
      el.watchlistList.innerHTML = '<div class="hint-text">' + state.watchlistError + '</div>';
    } else {
      el.watchlistList.innerHTML = renderWatchlistList(state.watchlist, state.lang);
      el.watchlistList.querySelectorAll('.watchlist-trade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-watchlist-index'));
          openTradeFromWatchlistItem(idx);
        });
      });
    }
  }
  syncMainEditorRails();
  applySlidesSceneLayout();
  renderWatchlistSearchCard();
  if (el.viewPositionDetail && el.viewPositionDetail.classList.contains('active')) {
    if (state.detailFromWatchlist && state.detailWatchlistQuote) {
      showWatchlistTradeDetail(state.detailWatchlistQuote, { preserveTrade: true, keepView: true });
    } else if (state.currentDetailIndex != null) {
      showPositionDetail(state.currentDetailIndex, { preserveTrade: true, keepView: true });
    }
  }
  updateLastUpdated();
}

function updateLastUpdated() {
  const text = formatLastUpdatedLabel(state.lastUpdated, state.autoRefreshSeconds);
  if (el.lastUpdatedStatus) el.lastUpdatedStatus.textContent = text;
  if (el.lastUpdatedStatusAnalysis) el.lastUpdatedStatusAnalysis.textContent = text;
}

const POLL_INTERVAL_MS = 5000;
const AUTO_REFRESH_SECONDS = 5;
const WATCHLIST_REFRESH_MS = Math.max(1000, POLL_INTERVAL_MS - 300);
let autoRefreshTimer = null;
let pollTimer = null;
let loadInFlightPromise = null;
let watchlistRefreshPromise = null;

async function refreshWatchlistIfNeeded(config, forceRefresh, options = {}) {
  const now = Date.now();
  if (!forceRefresh && state.watchlistLastUpdated && (now - state.watchlistLastUpdated < WATCHLIST_REFRESH_MS)) return;
  if (watchlistRefreshPromise) return watchlistRefreshPromise;
  const { quotesOnly = false } = options;
  const stateWatchlist = Array.isArray(state.watchlist) ? state.watchlist.map(item => ({ ...item })) : [];
  const snapshotWatchlist = await getWatchlistSnapshot();
  const previousWatchlist = mergeWatchlistItems(stateWatchlist, snapshotWatchlist);
  state.watchlistLastUpdated = now;

  watchlistRefreshPromise = (async () => {
    if (quotesOnly) {
      const seed = (Array.isArray(state.watchlist) && state.watchlist.length > 0)
        ? state.watchlist
        : getDefaultWatchlistItems();
      const seedCopy = seed.map(item => ({ ...item }));
      try {
        state.watchlist = await enrichWatchlistItemsWithQuotes(seedCopy, forceRefresh, config);
      } catch (_) {
        state.watchlist = seedCopy;
      }
      if (!Array.isArray(state.watchlist) || state.watchlist.length === 0) {
        state.watchlist = previousWatchlist.map(item => ({ ...item }));
      }
      state.watchlist = mergeWatchlistQuotesFromPrevious(state.watchlist, previousWatchlist);
      state.watchlistError = '';
      if (state.watchlist.some(hasWatchlistQuote)) await setWatchlistSnapshot(state.watchlist);
      return;
    }

    let watchlistItems = [];
    try {
      const items = await getWatchlistItems(config);
      watchlistItems = (Array.isArray(items) && items.length > 0)
        ? items
        : await getDefaultWatchlistWithQuotes(forceRefresh);
    } catch (err) {
      try {
        watchlistItems = await getDefaultWatchlistWithQuotes(forceRefresh);
      } catch (_) {
        watchlistItems = getDefaultWatchlistItems();
      }
    }
    try {
      const customItems = await getCustomWatchlistItems();
      watchlistItems = mergeWatchlistItems(watchlistItems, customItems);
    } catch (_) {}
    try {
      state.watchlist = await enrichWatchlistItemsWithQuotes(watchlistItems, forceRefresh, config);
    } catch (_) {
      state.watchlist = watchlistItems;
    }
    if (!Array.isArray(state.watchlist) || state.watchlist.length === 0) {
      state.watchlist = previousWatchlist.map(item => ({ ...item }));
    } else {
      state.watchlist = mergeWatchlistItems(state.watchlist, previousWatchlist);
    }
    state.watchlist = mergeWatchlistQuotesFromPrevious(state.watchlist, previousWatchlist);
    state.watchlistError = '';
    if (state.watchlist.some(hasWatchlistQuote)) await setWatchlistSnapshot(state.watchlist);
  })();

  try {
    await watchlistRefreshPromise;
  } finally {
    watchlistRefreshPromise = null;
  }
}

async function load(forceRefresh = false, silent = false) {
  if (loadInFlightPromise) {
    if (!forceRefresh) return loadInFlightPromise;
    await loadInFlightPromise;
  }

  loadInFlightPromise = (async () => {
    const now = Date.now();
    const rateLimitUntil = await getRateLimitUntil();
    if (autoRefreshTimer) {
      clearTimeout(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    const config = await getConfig();
    state.lang = config.language === 'en' ? 'en' : 'zh';
    if (!silent) {
      applyTheme(config);
      applyI18n(state.lang);
    }
    if (!config.apiKey || !config.apiSecret) {
      if (!silent) show('empty');
      return;
    }
    if (now < rateLimitUntil) {
      if (silent) {
        await refreshWatchlistIfNeeded(config, false, { quotesOnly: true });
        renderAll();
      } else {
        const sec = Math.ceil((rateLimitUntil - now) / 1000);
        setError(t(state.lang, 'error_rate_limit').replace('%s', String(sec)));
        show('error');
      }
      return;
    }
    if (!forceRefresh) {
      const cached = await getCachedData();
      if (cached) {
        state.summary = cached.summary;
        state.positions = cached.positions;
        state.cash = cached.summary;
        state.currency = (cached.summary && cached.summary.currency) || '';
        state.lastUpdated = cached.ts;
        state.autoRefreshSeconds = AUTO_REFRESH_SECONDS;
        await refreshWatchlistIfNeeded(config, forceRefresh);
        renderAll();
        if (!silent) show('content');
        return;
      }
    }
    if (!silent) {
      show('loading');
      if (el.loading) el.loading.classList.add('loading-dots');
      if (el.refresh) el.refresh.disabled = true;
    }
    try {
      const [summary, positions] = await Promise.all([getAccountSummary(), getPositions()]);
      await setCachedData(summary, Array.isArray(positions) ? positions : []);
      state.summary = summary;
      state.positions = Array.isArray(positions) ? positions : [];
      state.cash = summary;
      state.currency = summary.currency || '';
      state.lastUpdated = Date.now();
      state.autoRefreshSeconds = AUTO_REFRESH_SECONDS;
      await refreshWatchlistIfNeeded(config, forceRefresh);
      renderAll();
      if (!silent) show('content');
    } catch (err) {
      const status = err && err.status;
      if (status === 429) {
        let sec = 30;
        if (err.retryAfter) {
          const n = parseInt(err.retryAfter, 10);
          if (n > 0) sec = Math.min(n, 300);
        } else if (err.rateLimitReset) {
          const wait = Math.ceil((err.rateLimitReset * 1000 - Date.now()) / 1000);
          if (wait > 0) sec = Math.min(wait, 300);
        }
        const until = Date.now() + sec * 1000;
        await setRateLimitUntil(until);
        if (!silent) {
          setError(t(state.lang, 'error_rate_limit').replace('%s', String(sec)));
          show('error');
          if (el.refresh) el.refresh.disabled = true;
          setTimeout(async () => {
            await setRateLimitUntil(0);
            if (el.refresh) el.refresh.disabled = false;
          }, sec * 1000);
        }
        if (!silent && el.loading) el.loading.classList.remove('loading-dots');
        return;
      }
      if (!silent) {
        const msg = err instanceof Error ? err.message : (err && typeof err === 'object' ? (err.message || err.error || err.msg) : err);
        setError(msg);
      }
    } finally {
      if (!silent) {
        if (el.loading) el.loading.classList.remove('loading-dots');
        if (el.refresh) el.refresh.disabled = false;
      }
    }
  })();

  try {
    await loadInFlightPromise;
  } finally {
    loadInFlightPromise = null;
  }
}

function startPolling() {
  if (pollTimer) return;
  state.autoRefreshSeconds = AUTO_REFRESH_SECONDS;
  updateLastUpdated();
  pollTimer = setInterval(() => {
    load(false, true);
  }, POLL_INTERVAL_MS);
}

function hideFloatingWidgetIfEmbedded() {
  if (window.self === window.top) return;
  window.parent.postMessage({ type: 'T212_HIDE_FLOATING_WIDGET' }, '*');
  window.top.postMessage({ type: 'T212_HIDE_FLOATING_WIDGET' }, '*');
}

function openSidePanelAndMaybeHideFloating() {
  chrome.windows.getCurrent(win => {
    if (win && win.id != null) chrome.sidePanel.open({ windowId: win.id });
  });
  chrome.runtime.sendMessage({ type: 'T212_HIDE_FLOATING' }).catch(() => {});
  hideFloatingWidgetIfEmbedded();
}

if (el.positionsSort) {
  el.positionsSort.addEventListener('change', () => {
    state.sortKey = el.positionsSort.value;
    renderAll();
  });
}

if (el.codeWorkbenchMenu) {
  el.codeWorkbenchMenu.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target && target.closest ? target.closest('[data-workbench-action]') : null;
    if (!btn || !el.codeWorkbenchMenu.contains(btn)) return;
    const actionId = btn.getAttribute('data-workbench-action');
    handleCodeWorkbenchAction(actionId);
  });
}

if (el.workSkinTabs) {
  el.workSkinTabs.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target && target.closest ? target.closest('[data-work-skin-tab]') : null;
    if (!btn || !el.workSkinTabs.contains(btn)) return;
    const tabId = btn.getAttribute('data-work-skin-tab');
    if (!tabId) return;
    setActiveWorkSkinTab(tabId);
  });
}

window.addEventListener('resize', () => {
  updateSkinMenuWidth();
  renderWorkSkinChrome();
  updateSoulCursor();
  syncMainEditorRails();
  applySlidesSceneLayout();
});

if (el.detailBack) el.detailBack.addEventListener('click', backFromDetail);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && el.viewPositionDetail && el.viewPositionDetail.classList.contains('active')) {
    backFromDetail();
  }
});
if (el.refresh) el.refresh.addEventListener('click', () => load(true));
const retryBtn = document.getElementById('retryBtn');
if (retryBtn) retryBtn.addEventListener('click', () => load(true));
if (el.openOptions) el.openOptions.addEventListener('click', function(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
if (el.statusBarOptions) {
  el.statusBarOptions.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}
if (el.statusBarSidePanel) {
  el.statusBarSidePanel.addEventListener('click', function(e) {
    e.preventDefault();
    openSidePanelAndMaybeHideFloating();
  });
}
if (el.themeToggle) {
  el.themeToggle.addEventListener('click', function() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    chrome.storage.local.set({ theme: next, skinThemeMode: next });
    el.themeToggle.title = next === 'light' ? t(state.lang, 'theme_switch_dark') : t(state.lang, 'theme_switch_light');
  });
}
if (el.btnSkinMenu) {
  el.btnSkinMenu.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleSkinMenu();
  });
}
if (el.skinMenu) {
  el.skinMenu.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target instanceof Element ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
    const btn = target && target.closest ? target.closest('[data-skin-option]') : null;
    if (!btn || !el.skinMenu.contains(btn)) return;
    const id = btn.getAttribute('data-skin-option');
    if (!id) return;
    closeSkinMenu();
    setWorkSkin(id).catch(() => {});
  });
}
document.addEventListener('click', function(e) {
  if (!el.skinMenu || !el.btnSkinMenu) return;
  const target = e.target instanceof Element ? e.target : null;
  if (!target) {
    closeSkinMenu();
    return;
  }
  if (target && (target === el.btnSkinMenu || el.btnSkinMenu.contains(target) || el.skinMenu.contains(target))) return;
  closeSkinMenu();
});
if (el.btnOverview) {
  el.btnOverview.addEventListener('click', () => showView('main'));
}
if (el.btnAnalysis) {
  el.btnAnalysis.addEventListener('click', () => showView('analysis'));
}
if (el.btnWatchlist) {
  el.btnWatchlist.addEventListener('click', () => showView('watchlist'));
}
if (el.statusBarSidePanelFromAnalysis) {
  el.statusBarSidePanelFromAnalysis.addEventListener('click', function(e) {
    e.preventDefault();
    openSidePanelAndMaybeHideFloating();
  });
}
if (el.analysisBack) {
  el.analysisBack.addEventListener('click', () => showView('main'));
}
if (el.watchlistBack) {
  el.watchlistBack.addEventListener('click', () => showView('main'));
}
if (el.watchlistSearch) {
  el.watchlistSearch.addEventListener('click', () => { searchWatchlistTicker(); });
}
if (el.watchlistTickerInput) {
  el.watchlistTickerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchWatchlistTicker();
    }
  });
}
if (el.statusBarOptionsFromAnalysis) {
  el.statusBarOptionsFromAnalysis.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}
if (el.analysisModelSelect) {
  el.analysisModelSelect.addEventListener('change', function() {
    chrome.storage.local.set({ openRouterModel: this.value });
  });
}
if (el.analysisLanguageSelect) {
  el.analysisLanguageSelect.addEventListener('change', function() {
    chrome.storage.local.set({ analysisLanguage: this.value });
    syncAnalysisPromptEditor(true);
  });
}
if (el.analysisResetPrompt) {
  el.analysisResetPrompt.addEventListener('click', () => {
    syncAnalysisPromptEditor(true);
  });
}
if (el.analysisCopyPrompt) {
  el.analysisCopyPrompt.addEventListener('click', async () => {
    const text = (el.analysisPromptInput && el.analysisPromptInput.value.trim()) ? el.analysisPromptInput.value : getDefaultAnalysisPrompt();
    try {
      await navigator.clipboard.writeText(text);
      if (el.analysisPromptStatus) {
        el.analysisPromptStatus.textContent = t(state.lang, 'analysis_prompt_copied');
        el.analysisPromptStatus.classList.remove('hidden');
        setTimeout(() => { if (el.analysisPromptStatus) el.analysisPromptStatus.classList.add('hidden'); }, 3000);
      }
    } catch (e) {
      if (el.analysisError) {
        el.analysisError.textContent = (e && e.message) || '复制失败';
        el.analysisError.classList.remove('hidden');
      }
    }
  });
}
if (el.analysisOpenMiroMindSite) {
  el.analysisOpenMiroMindSite.addEventListener('click', async () => {
    const config = await getConfig();
    const url = (config.miroMindUrl || 'https://dr.miromind.ai/').replace(/\/$/, '') || 'https://dr.miromind.ai';
    window.open(url, '_blank');
  });
}
if (el.analysisOpenChatGPTSite) {
  el.analysisOpenChatGPTSite.addEventListener('click', () => {
    window.open('https://chatgpt.com/', '_blank');
  });
}
if (el.analysisOpenPerplexitySite) {
  el.analysisOpenPerplexitySite.addEventListener('click', () => {
    window.open('https://www.perplexity.ai/', '_blank');
  });
}
if (el.analysisCopyAndOpenMiroMind) {
  el.analysisCopyAndOpenMiroMind.addEventListener('click', async function() {
    const config = await getConfig();
    const prompt = (el.analysisPromptInput && el.analysisPromptInput.value.trim()) ? el.analysisPromptInput.value : getDefaultAnalysisPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      const url = (config.miroMindUrl || 'https://dr.miromind.ai/').replace(/\/$/, '') || 'https://dr.miromind.ai';
      window.open(url, '_blank');
      if (el.analysisMiroMindStatus) {
        el.analysisMiroMindStatus.textContent = t(state.lang, 'analysis_copied_open');
        el.analysisMiroMindStatus.classList.remove('hidden');
        setTimeout(() => { if (el.analysisMiroMindStatus) { el.analysisMiroMindStatus.classList.add('hidden'); } }, 4000);
      }
    } catch (e) {
      if (el.analysisError) {
        el.analysisError.textContent = (e && e.message) || '复制失败';
        el.analysisError.classList.remove('hidden');
      }
    }
  });
}
if (el.analysisGenerate) {
  el.analysisGenerate.addEventListener('click', async function() {
    const config = await getConfig();
    if (!config.customAnalysisApiUrl && !config.openRouterApiKey) {
      if (el.analysisError) {
        el.analysisError.textContent = t(state.lang, 'analysis_no_key');
        el.analysisError.classList.remove('hidden');
      }
      if (el.analysisResult) el.analysisResult.classList.add('hidden');
      return;
    }
    const model = el.analysisModelSelect ? el.analysisModelSelect.value : config.openRouterModel;
    const effectiveLang = getEffectiveAnalysisLang();
    const promptInput = el.analysisPromptInput ? el.analysisPromptInput.value.trim() : '';
    const customPrompt = !config.customAnalysisApiUrl && promptInput ? promptInput : '';
    if (el.analysisError) el.analysisError.classList.add('hidden');
    if (el.analysisResult) el.analysisResult.classList.add('hidden');
    el.analysisGenerate.disabled = true;
    el.analysisGenerate.textContent = t(state.lang, 'analysis_loading');
    try {
      const text = await getMarketAnalysisFromConfig(config, state.positions, state.summary, effectiveLang, model, customPrompt);
      if (el.analysisResult) {
        el.analysisResult.textContent = text;
        el.analysisResult.classList.remove('hidden');
      }
    } catch (err) {
      if (el.analysisError) {
        el.analysisError.textContent = err && err.message ? err.message : t(state.lang, 'analysis_error');
        el.analysisError.classList.remove('hidden');
      }
    } finally {
      el.analysisGenerate.disabled = false;
      el.analysisGenerate.textContent = t(state.lang, 'analysis_generate_in_extension');
    }
  });
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!(changes.workSkin || changes.theme || changes.skinThemeMode || changes.opacity || changes.language)) return;
    getConfig().then(config => {
      state.lang = config.language === 'en' ? 'en' : 'zh';
      applyTheme(config);
      applyI18n(state.lang);
      updateLastUpdated();
    }).catch(() => {});
  });
}

getConfig().then(config => {
  state.lang = config.language === 'en' ? 'en' : 'zh';
  applyTheme(config);
  applyI18n(state.lang);
  load(false).then(() => { startPolling(); });
});
