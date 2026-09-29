import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Item } from './types';
import { deadlineFor, warrantyEnd, addDays, atNineAM } from './date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

type Job = { id: string; date: Date; title: string; body: string };

function jobsFor(item: Item, demo: boolean): Job[] {
  const jobs: Job[] = [];
  const label = `${item.itemName} · ${item.store}`;

  if (item.status === 'active') {
    const dl = deadlineFor(item, demo);
    jobs.push({ id: 'ret-1', date: atNineAM(addDays(dl, -1)), title: '⏰ Return window closes tomorrow', body: `${label} - last chance is tomorrow.` });
    jobs.push({ id: 'ret-0', date: atNineAM(dl), title: '🚨 Last day to return', body: `${label} - today is the last day.` });
  }

  if ((item.status === 'active' || item.status === 'kept') && item.warrantyMonths) {
    const we = warrantyEnd(item)!;
    jobs.push({ id: 'war-30', date: atNineAM(addDays(we, -30)), title: '🛡️ Warranty ends in 30 days', body: `${label} - test it now while you're still covered.` });
    jobs.push({ id: 'war-7', date: atNineAM(addDays(we, -7)), title: '🛡️ Warranty ends in 7 days', body: `${label} - last week to make a claim.` });
  }

  return jobs.filter((j) => j.date.getTime() > Date.now());
}

export async function scheduleItemNotifications(item: Item, demoMode: boolean): Promise<void> {
  await cancelItemNotifications(item.id);
  for (const j of jobsFor(item, demoMode)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${item.id}|${j.id}`,
      content: { title: j.title, body: j.body, data: { itemId: item.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.date },
    });
  }
}

export async function rescheduleAll(items: Item[], demoMode: boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const it of items) await scheduleItemNotifications(it, demoMode);
}

export async function cancelItemNotifications(itemId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith(`${itemId}|`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** For demos: fires a real local notification in a few seconds. */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: '🚨 Last day to return', body: 'Sony WH-1000XM5 · Amazon - today is the last day.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}
