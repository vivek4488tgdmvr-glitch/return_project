import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
let distinctId: string | null = null;

async function getId() {
  if (distinctId) return distinctId;
  let id = await AsyncStorage.getItem('analytics_id');
  if (!id) {
    id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem('analytics_id', id);
  }
  distinctId = id;
  return id;
}

/** Fire-and-forget PostHog event: item_added, paywall_viewed, purchase, ... */
export function track(event: string, properties: Record<string, unknown> = {}) {
  if (__DEV__) console.log('[track]', event, properties);
  if (!KEY) return;
  getId()
    .then((id) =>
      fetch('https://us.i.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: KEY, event, distinct_id: id, properties }),
      })
    )
    .catch(() => {});
}
