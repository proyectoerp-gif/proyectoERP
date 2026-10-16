const paths: Record<string, string> = {
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  home: 'm3 10 9-7 9 7v10H3z M9 20v-7h6v7',
  sales: 'M4 6h16v14H4z M8 6V3h8v3 M8 11h8 M8 15h5',
  purchases: 'M3 4h3l3 11h10l2-8H7 M10 20h.01 M18 20h.01',
  inventory: 'm3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9 M8 5l9 5',
  finance: 'M3 6h18v14H3z M3 10h18 M7 15h4',
  team: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M16 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 5',
  operations: 'm14 3 1 3 3 1 3-1v5l-3 2-1 3-3 1-2 4H7l-2-4-3-1v-5l3-2 1-3 3-1 2-3z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M17 17l5 5',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 17h.01',
  close: 'm6 6 12 12 M6 18 18 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  logout: 'M10 4H4v16h6 M8 12h13 M17 8l4 4-4 4',
  settings: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  check: 'm5 12 4 4L19 6'
};
export function WorkspaceIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.operations}/></svg>;
}
