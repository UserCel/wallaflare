export interface NavItem {
  id: string;
  label: string;
  iconSvg: string;
  countKey?: string;
  filterName?: string;
  onClickExpr?: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'tabUnread',
    label: 'Unread',
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    countKey: 'countUnread',
    filterName: 'unread'
  },
  {
    id: 'tabStarred',
    label: 'Starred',
    iconSvg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    countKey: 'countStarred',
    filterName: 'starred'
  },
  {
    id: 'tabArchive',
    label: 'Archive',
    iconSvg: '<polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line>',
    countKey: 'countArchive',
    filterName: 'archive'
  },
  {
    id: 'tabAll',
    label: 'All Articles',
    iconSvg: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
    countKey: 'countAll',
    filterName: 'all'
  }
];

export const TOOL_NAV_ITEMS: NavItem[] = [
  {
    id: 'navManageTags',
    label: 'Manage Tags',
    iconSvg: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>',
    onClickExpr: 'openGlobalTagModal()'
  },
  {
    id: 'navSyncClients',
    label: 'Sync & Clients',
    iconSvg: '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>',
    onClickExpr: 'openModal(\'syncModal\')'
  },
  {
    id: 'navApiDeveloper',
    label: 'Developer / API',
    iconSvg: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
    onClickExpr: 'openModal(\'devModal\')'
  },
  {
    id: 'navSettings',
    label: 'Settings',
    iconSvg: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    onClickExpr: 'openModal(\'settingsModal\')'
  }
];
