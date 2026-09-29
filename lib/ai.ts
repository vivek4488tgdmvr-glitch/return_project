// Reads a receipt photo with a vision model and returns structured fields.
// NOTE: the key is bundled in the app - fine for a hackathon, but proxy it through a server for production.
const KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;
const MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini';

export type Extracted = {
  store?: string;
  itemName?: string;
  price?: number;
  purchaseDate?: Date;
};

export const aiAvailable = !!KEY;

export async function extractReceipt(base64: string): Promise<Extracted | null> {
  if (!KEY) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'You read shopping receipts. Reply ONLY with JSON: {"store": string, "itemName": string (the main / most expensive item, short), "price": number (price of that item, or the total if unclear), "purchaseDate": "YYYY-MM-DD"}. Use null for anything you cannot read.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the receipt fields.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const p = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');

    const out: Extracted = {};
    if (typeof p.store === 'string' && p.store.trim()) out.store = p.store.trim();
    if (typeof p.itemName === 'string' && p.itemName.trim()) out.itemName = p.itemName.trim();
    if (typeof p.price === 'number' && isFinite(p.price)) out.price = p.price;
    const m = typeof p.purchaseDate === 'string' && p.purchaseDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
      if (!isNaN(d.getTime()) && d.getTime() <= Date.now()) out.purchaseDate = d;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
