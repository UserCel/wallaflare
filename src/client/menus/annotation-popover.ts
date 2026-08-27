export interface HighlightColorOption {
  id: string;
  label: string;
  cssClass: string;
}

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  { id: 'yellow', label: 'Yellow', cssClass: 'hl-yellow' },
  { id: 'green', label: 'Green', cssClass: 'hl-green' },
  { id: 'blue', label: 'Blue', cssClass: 'hl-blue' },
  { id: 'purple', label: 'Purple', cssClass: 'hl-purple' }
];

export function generateHighlightPopoverHtml(): string {
  const colorBtns = HIGHLIGHT_COLORS.map(
    (c) => '<button type="button" class="hl-color-btn ' + c.cssClass + '" onclick="changePopoverHighlightColor(\'' + c.id + '\')" title="' + c.label + '"></button>'
  ).join('');

  return (
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
      '<div style="display: flex; gap: 0.35rem; align-items: center;" id="popoverColors">' +
        colorBtns +
      '</div>' +
      '<div style="display: flex; gap: 0.25rem; align-items: center;">' +
        '<button type="button" class="btn-icon" onclick="copyPopoverQuote()" title="Copy Quote" style="padding: 3px;">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
        '</button>' +
        '<button type="button" class="btn-icon" onclick="deletePopoverHighlight()" title="Delete Highlight" style="color: var(--danger); padding: 3px;">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div id="popoverQuoteText" style="font-size: 0.78rem; font-style: italic; color: var(--text-secondary); max-height: 55px; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.4rem;"></div>' +
    '<div id="popoverNoteText" style="font-size: 0.8rem; color: var(--text-primary); margin-bottom: 0.4rem; padding: 0.3rem 0.45rem; background: var(--bg-primary); border-radius: var(--radius-sm); border-left: 3px solid var(--accent); display: none;"></div>' +
    '<div style="display: flex; gap: 0.35rem; border-top: 1px solid var(--border-color); padding-top: 0.4rem;">' +
      '<button type="button" class="btn btn-outline" style="flex: 1; padding: 2px 6px; font-size: 0.75rem;" onclick="openAnnotationNoteModal(activePopoverAnnotation)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 3px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span id="popoverNoteActionLabel">Add Note</span></button>' +
    '</div>'
  );
}
