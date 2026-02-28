export const SKIN_PROFILES = [
  {
    id: 'code',
    name: 'Code Desk',
    defaultTheme: 'dark',
    fontStack: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', 'Ubuntu Mono', monospace",
    accent: '#c586c0',
    density: 'compact',
    headerStyle: 'editor-flat',
    listStyle: 'line-list'
  },
  {
    id: 'doc',
    name: 'Document Desk',
    defaultTheme: 'light',
    fontStack: "'Aptos', 'Segoe UI', 'Calibri', sans-serif",
    accent: '#0f6cbd',
    density: 'comfortable',
    headerStyle: 'document-ribbon',
    listStyle: 'paragraph-list'
  },
  {
    id: 'sheet',
    name: 'Spreadsheet Desk',
    defaultTheme: 'light',
    fontStack: "'Aptos', 'Calibri', 'Segoe UI', sans-serif",
    accent: '#1f7244',
    density: 'compact',
    headerStyle: 'grid-toolbar',
    listStyle: 'cell-grid'
  },
  {
    id: 'slides',
    name: 'Slides Desk',
    defaultTheme: 'light',
    fontStack: "'Aptos', 'Segoe UI', 'Calibri', sans-serif",
    accent: '#c43e00',
    density: 'comfortable',
    headerStyle: 'deck-toolbar',
    listStyle: 'card-outline'
  },
  {
    id: 'mail',
    name: 'Mail Desk',
    defaultTheme: 'light',
    fontStack: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    accent: '#0a66c2',
    density: 'comfortable',
    headerStyle: 'inbox-bar',
    listStyle: 'thread-list'
  }
];

const SKIN_PROFILE_MAP = new Map(SKIN_PROFILES.map(profile => [profile.id, profile]));

export const DEFAULT_WORK_SKIN = 'code';

export function normalizeWorkSkin(value) {
  const id = String(value || '').trim().toLowerCase();
  if (SKIN_PROFILE_MAP.has(id)) return id;
  return DEFAULT_WORK_SKIN;
}

export function normalizeTheme(value) {
  if (value === 'dark') return 'dark';
  if (value === 'light') return 'light';
  return '';
}

export function normalizeSkinThemeMode(value) {
  if (value === 'light' || value === 'dark' || value === 'follow') return value;
  return 'follow';
}

export function getSkinProfile(workSkin) {
  const id = normalizeWorkSkin(workSkin);
  return SKIN_PROFILE_MAP.get(id) || SKIN_PROFILE_MAP.get(DEFAULT_WORK_SKIN);
}

export function resolveAppearance(config = {}) {
  const workSkin = normalizeWorkSkin(config.workSkin);
  const skinThemeMode = normalizeSkinThemeMode(config.skinThemeMode);
  const profile = getSkinProfile(workSkin);
  const theme = skinThemeMode === 'follow' ? profile.defaultTheme : skinThemeMode;

  return {
    workSkin,
    skinThemeMode,
    theme,
    profile
  };
}

export function applyAppearance(config = {}, opts = {}) {
  const doc = opts.document || document;
  const root = doc.documentElement;

  const opacity = Math.max(0, Math.min(1, Number(config.opacity) || 1));
  root.style.setProperty('--app-opacity', String(opacity));
  root.toggleAttribute('data-low-opacity', opacity < 0.4);

  const resolved = resolveAppearance(config);
  root.setAttribute('data-theme', resolved.theme);
  root.setAttribute('data-work-skin', resolved.workSkin);
  return resolved;
}

export function getDefaultThemeForSkin(workSkin) {
  return getSkinProfile(workSkin).defaultTheme;
}

export function skinLabelKey(id) {
  return `skin_${normalizeWorkSkin(id)}`;
}

export function skinDescKey(id) {
  return `skin_desc_${normalizeWorkSkin(id)}`;
}
