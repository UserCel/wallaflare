export interface SortOption {
  id: string;
  label: string;
  iconSvg: string;
}

export const SORT_OPTIONS: SortOption[] = [
  {
    id: 'newest',
    label: 'Newest First',
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
  },
  {
    id: 'oldest',
    label: 'Oldest First',
    iconSvg: '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>'
  },
  {
    id: 'shortest',
    label: 'Shortest Read',
    iconSvg: '<line x1="4" y1="12" x2="12" y2="12"></line><line x1="4" y1="6" x2="8" y2="6"></line><line x1="4" y1="18" x2="16" y2="18"></line>'
  },
  {
    id: 'longest',
    label: 'Longest Read',
    iconSvg: '<line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="16" y2="12"></line><line x1="4" y1="18" x2="8" y2="18"></line>'
  },
  {
    id: 'title',
    label: 'Title (A-Z)',
    iconSvg: '<path d="M4 19V5h3v14H4zM10 19l4.5-14h2L21 19h-2.4l-.8-2.6h-3.6l-.8 2.6H10zm4.2-4.7h2.6L15.5 9.2h-.1l-1.2 5.1z"></path>'
  },
  {
    id: 'domain',
    label: 'Website / Domain',
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>'
  }
];

export function generateSortMenuHtml(currentOrder: string = 'newest', closeFnName: string = 'closeAllCardMenus()'): string {
  return SORT_OPTIONS.map((opt) => {
    const isActive = opt.id === currentOrder;
    const checkmark = isActive
      ? '<span style="margin-left: auto; font-weight: 700; color: var(--accent); font-size: 0.9rem;">✓</span>'
      : '';

    return (
      '<button type="button" class="menu-item ' + (isActive ? 'active' : '') + '" onclick="setSortOrder(\'' + opt.id + '\'); ' + closeFnName + ';">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          opt.iconSvg +
        '</svg>' +
        '<span>' + opt.label + '</span>' +
        checkmark +
      '</button>'
    );
  }).join('');
}
