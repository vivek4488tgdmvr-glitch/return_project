import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item } from './types';

const KEY = 'items_v1';
const DEMO_KEY = 'demo_mode_v1';
const CUR_KEY = 'currency_v1';
const PRO_KEY = 'dev_force_pro_v1';

export async function loadItems(): Promise<Item[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Item[]) : [];
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function getItem(id: string): Promise<Item | undefined> {
  return (await loadItems()).find((i) => i.id === id);
}

export async function upsertItem(item: Item): Promise<void> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  await saveItems(items);
}

export async function deleteItem(id: string): Promise<void> {
  await saveItems((await loadItems()).filter((i) => i.id !== id));
}

/** Free-plan limit counts only items still being tracked. */
export async function activeCount(): Promise<number> {
  return (await loadItems()).filter((i) => i.status === 'active').length;
}

export async function getDemoMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEMO_KEY)) === '1';
}
export async function setDemoMode(on: boolean): Promise<void> {
  await AsyncStorage.setItem(DEMO_KEY, on ? '1' : '0');
}

export async function getCurrency(): Promise<string> {
  return (await AsyncStorage.getItem(CUR_KEY)) ?? '₹';
}
export async function setCurrency(c: string): Promise<void> {
  await AsyncStorage.setItem(CUR_KEY, c);
}

// Dev-only switch so you can demo Pro features without a real purchase.
export async function getForcePro(): Promise<boolean> {
  return (await AsyncStorage.getItem(PRO_KEY)) === '1';
}
export async function setForcePro(on: boolean): Promise<void> {
  await AsyncStorage.setItem(PRO_KEY, on ? '1' : '0');
}
