import { Item } from './types';

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

export const startOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

export const atNineAM = (d: Date) => {
  const r = new Date(d);
  r.setHours(9, 0, 0, 0);
  return r;
};

/** Last moment (23:59) of the final return day. Demo mode = 3 days from when the item was added. */
export function deadlineFor(item: Item, demoMode: boolean): Date {
  const base = demoMode ? new Date(item.createdAt) : new Date(item.purchaseDate);
  const d = addDays(base, demoMode ? 3 : item.returnWindowDays);
  d.setHours(23, 59, 0, 0);
  return d;
}

export function warrantyEnd(item: Item): Date | undefined {
  if (!item.warrantyMonths) return undefined;
  const d = addMonths(new Date(item.purchaseDate), item.warrantyMonths);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Calendar days left: 0 = today, negative = expired */
export function daysLeft(deadline: Date): number {
  return Math.round((startOfDay(deadline).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
