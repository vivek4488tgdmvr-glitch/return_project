import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { initPurchases } from '../lib/purchases';
import { requestNotifPermission } from '../lib/notifications';
import { C } from '../lib/theme';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initPurchases().catch(console.warn);
    requestNotifPermission().catch(console.warn);

    // Tapping a reminder opens that item
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.itemId as string | undefined;
      if (id) router.push(`/item/${id}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Return' }} />
        <Stack.Screen name="add" options={{ title: 'Add Item', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
        <Stack.Screen name="paywall" options={{ title: 'Go Pro', presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
