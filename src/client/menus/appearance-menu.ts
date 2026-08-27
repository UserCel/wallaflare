export interface FontOption {
  id: string;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
  { id: 'dyslexic', label: 'Dyslexic' }
];

export interface LineHeightOption {
  id: string;
  label: string;
}

export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  { id: 'compact', label: '1.4' },
  { id: 'normal', label: '1.7' },
  { id: 'relaxed', label: '2.0' }
];

export interface WidthOption {
  id: string;
  label: string;
}

export const WIDTH_OPTIONS: WidthOption[] = [
  { id: 'narrow', label: '650px' },
  { id: 'medium', label: '780px' },
  { id: 'wide', label: '920px' },
  { id: 'full', label: '100%' }
];

export interface ThemeOption {
  id: string;
  label: string;
  themeClass: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dark', label: 'Dark', themeClass: 'theme-dark' },
  { id: 'light', label: 'Light', themeClass: 'theme-light' },
  { id: 'sepia', label: 'Sepia', themeClass: 'theme-sepia' },
  { id: 'oled', label: 'OLED', themeClass: 'theme-oled' }
];

export function generateAppearancePopoverHtml(): string {
  const fontBtns = FONT_OPTIONS.map(
    (f) => '<button type="button" class="btn btn-outline opt-font-btn" data-font="' + f.id + '" onclick="setReaderFontFamily(\'' + f.id + '\')">' + f.label + '</button>'
  ).join('');

  const lhBtns = LINE_HEIGHT_OPTIONS.map(
    (lh) => '<button type="button" class="btn btn-outline opt-lh-btn" data-lh="' + lh.id + '" onclick="setReaderLineHeight(\'' + lh.id + '\')">' + lh.label + '</button>'
  ).join('');

  const widthBtns = WIDTH_OPTIONS.map(
    (w) => '<button type="button" class="btn btn-outline opt-width-btn" data-width="' + w.id + '" onclick="setReaderContentWidth(\'' + w.id + '\')">' + w.label + '</button>'
  ).join('');

  const themeBtns = THEME_OPTIONS.map(
    (t) => '<button type="button" class="opt-theme-btn ' + t.themeClass + '" data-theme="' + t.id + '" onclick="setTheme(\'' + t.id + '\')">' + t.label + '</button>'
  ).join('');

  return (
    '<div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">' +
      '<span style="font-weight: 700; font-size: 0.92rem;">Typography &amp; Theme</span>' +
      '<button type="button" class="close-btn" onclick="toggleReaderAppearancePopover()">&times;</button>' +
    '</div>' +

    '<div>' +
      '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Font Family</label>' +
      '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;" id="popoverFontFamilyBtns">' +
        fontBtns +
      '</div>' +
    '</div>' +

    '<div>' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">' +
        '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Font Size</label>' +
        '<span id="fontSizeDisplay" style="font-size: 0.8rem; font-weight: 700; color: var(--accent);">18px</span>' +
      '</div>' +
      '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
        '<button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-weight: bold;" onclick="adjustReaderFontSize(-1)">A-</button>' +
        '<input type="range" id="fontSizeRange" min="12" max="32" step="1" style="flex: 1; accent-color: var(--accent); cursor: pointer;" oninput="setReaderFontSize(parseInt(this.value, 10))">' +
        '<button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-weight: bold;" onclick="adjustReaderFontSize(1)">A+</button>' +
      '</div>' +
    '</div>' +

    '<div>' +
      '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Line Spacing</label>' +
      '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem;" id="popoverLineHeightBtns">' +
        lhBtns +
      '</div>' +
    '</div>' +

    '<div>' +
      '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Reading Width</label>' +
      '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;" id="popoverContentWidthBtns">' +
        widthBtns +
      '</div>' +
    '</div>' +

    '<div>' +
      '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Text Alignment</label>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem;" id="popoverAlignmentBtns">' +
        '<button type="button" class="btn btn-outline opt-align-btn" data-align="start" onclick="setReaderAlignment(\'left\')">Left</button>' +
        '<button type="button" class="btn btn-outline opt-align-btn" data-align="justify" onclick="setReaderAlignment(\'justify\')">Justify</button>' +
      '</div>' +
    '</div>' +

    '<div>' +
      '<label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Theme</label>' +
      '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;" id="popoverThemeBtns">' +
        themeBtns +
      '</div>' +
    '</div>'
  );
}
