import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getDemoMode, setDemoMode, getCurrency, setCurrency, loadItems, getForcePro, setForcePro,
} from '../lib/storage';
import { getIsPro } from '../lib/purchases';
import { cancelAll, rescheduleAll, sendTestNotification, requestNotifPermission } from '../lib/notifications';
import { C, CURRENCIES } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';

export default function Settings() {
  const [demo, setDemo] = useState(false);
  const [pro, setPro] = useState(false);
  const [cur, setCur] = useState('$');
  const [forcePro, setForce] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setDemo(await getDemoMode());
        setPro(await getIsPro());
        setCur(await getCurrency());
        setForce(await getForcePro());
      })();
    }, [])
  );

  const toggleDemo = async (v: boolean) => {
    setDemo(v);
    await setDemoMode(v);
    await rescheduleAll((await loadItems()).filter((i) => i.status !== 'returned'), v);
    Alert.alert(
      'Demo mode ' + (v ? 'on' : 'off'),
      v ? 'Return deadlines are now 3 days after you add an item.' : 'Using the real return windows.'
    );
  };

  const pickCurrency = async (c: string) => { setCur(c); await setCurrency(c); };

  const testReminder = async () => {
    if (!(await requestNotifPermission())) {
      Alert.alert('Notifications are off', 'Allow notifications in your phone settings to get reminders.');
      return;
    }
    await sendTestNotification();
    Alert.alert('Sent', 'A test reminder will arrive in 5 seconds. Lock your phone to see it.');
  };

  const clearAllReminders = () =>
    Alert.alert('Cancel all reminders?', 'Scheduled notifications will be removed.', [
      { text: 'Keep them', style: 'cancel' },
      { text: 'Cancel reminders', style: 'destructive', onPress: () => cancelAll() },
    ]);

  const toggleForce = async (v: boolean) => {
    setForce(v);
    await setForcePro(v);
    setPro(await getIsPro());
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <View style={s.row}>
          <Text style={s.label}>Demo mode</Text>
          <Switch value={demo} onValueChange={toggleDemo} />
        </View>
        <Text style={s.hint}>Gives every new item a 3-day return window so you can show the countdown live.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={{ marginTop: 24 }}>
        <Text style={s.label}>Currency</Text>
        <View style={s.chips}>
          {CURRENCIES.map((c) => (
            <PressableScale key={c} scaleTo={0.9} style={[s.chip, cur === c && s.chipOn]} onPress={() => pickCurrency(c)}>
              <Text style={[s.chipText, cur === c && { color: '#fff' }]}>{c}</Text>
            </PressableScale>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} style={{ marginTop: 24 }}>
        <View style={s.row}>
          <Text style={s.label}>Plan</Text>
          <Text style={s.value}>{pro ? 'Pro ✓' : 'Free'}</Text>
        </View>
        {!pro && (
          <PressableScale style={s.upgrade} onPress={() => router.push('/paywall')}>
            <Text style={s.upgradeText}>Upgrade to Pro</Text>
          </PressableScale>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).springify().damping(18)} style={{ marginTop: 24 }}>
        <PressableScale style={s.secondary} onPress={testReminder}>
          <Text style={s.secondaryText}>Send a test reminder</Text>
        </PressableScale>
        <PressableScale style={s.danger} onPress={clearAllReminders}>
          <Text style={s.dangerText}>Cancel all reminders</Text>
        </PressableScale>
      </Animated.View>

      {__DEV__ && (
        <Animated.View entering={FadeInDown.delay(320)} style={{ marginTop: 24 }}>
          <View style={s.row}>
            <Text style={s.label}>Dev: force Pro</Text>
            <Switch value={forcePro} onValueChange={toggleForce} />
          </View>
          <Text style={s.hint}>Only shows in development builds. Test a real sandbox purchase before you submit.</Text>
        </Animated.View>
      )}

      <Text style={s.privacy}>
        Your items and receipt photos stay on this phone. When you scan a receipt, that one photo is sent to an AI service to read it.
      </Text>
      <Text style={s.version}>Return v1.0 · Shipaton 2026</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.card },
  label: { color: '#fff', fontSize: 16 },
  value: { color: C.soft, fontWeight: '800' },
  hint: { color: C.muted, fontSize: 12, marginTop: 8 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 12 },
  chip: { backgroundColor: C.card, width: 56, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chipOn: { backgroundColor: C.primary },
  chipText: { color: C.sub, fontWeight: '800', fontSize: 18 },
  upgrade: { marginTop: 14, backgroundColor: C.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  upgradeText: { color: '#fff', fontWeight: '800' },
  secondary: { backgroundColor: C.card, padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: '#fff', fontWeight: '700' },
  danger: { marginTop: 12, padding: 14, alignItems: 'center' },
  dangerText: { color: C.bad, fontWeight: '700' },
  privacy: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 32, lineHeight: 18 },
  version: { color: '#475569', textAlign: 'center', marginTop: 16, fontSize: 12 },
});
