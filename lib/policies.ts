// Default return windows (days) and typical warranty (months). Users can always edit them.
const POLICIES: { match: string; days: number; warranty?: number }[] = [
  { match: 'amazon', days: 30 },
  { match: 'apple', days: 14, warranty: 12 },
  { match: 'walmart', days: 90 },
  { match: 'target', days: 90 },
  { match: 'best buy', days: 15 },
  { match: 'costco', days: 90 },
  { match: 'ikea', days: 365 },
  { match: 'nike', days: 60 },
  { match: 'adidas', days: 30 },
  { match: 'zara', days: 30 },
  { match: 'h&m', days: 30 },
  { match: 'uniqlo', days: 30 },
  { match: 'ebay', days: 30 },
  { match: 'home depot', days: 90 },
  { match: 'flipkart', days: 10 },
  { match: 'myntra', days: 15 },
  { match: 'croma', days: 10 },
  { match: 'samsung', days: 15, warranty: 12 },
  { match: 'sony', days: 30, warranty: 12 },
];

export function policyFor(store: string) {
  const s = store.trim().toLowerCase();
  if (s.length < 3) return null;
  return POLICIES.find((p) => s.includes(p.match)) ?? null;
}
