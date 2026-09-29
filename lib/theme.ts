export const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#ffffff',
  sub: '#94a3b8',
  muted: '#64748b',
  primary: '#6366f1',
  soft: '#a5b4fc',
  good: '#22c55e',
  warn: '#f59e0b',
  bad: '#ef4444',
};

export const urgencyColor = (days: number) =>
  days <= 2 ? C.bad : days <= 7 ? C.warn : C.good;

export const CURRENCIES = ['$', '€', '£', '₹'];

export const money = (cur: string, n: number) =>
  `${cur}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
