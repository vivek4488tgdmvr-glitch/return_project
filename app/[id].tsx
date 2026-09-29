import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, ZoomIn, FadeIn, useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { Item } from '../lib/types';
import { getItem, upsertItem, deleteItem, getDemoMode, getCurrency } from '../lib/storage';
import { deadlineFor, warrantyEnd, daysLeft, formatDate } from '../lib/date';
import { scheduleItemNotifications, cancelItemNotifications } from '../lib/notifications';
import { receiptPath, deleteReceipt } from '../lib/files';
import { track } from '../lib/analytics';
import { C, urgencyColor, money } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';
import { Confetti } from '../components/Confetti';

function Bar({ pct, color }: { pct: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(250, withTiming(Math.max(0.03, Math.min(1, pct)), { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={s.barBg}>
      <Animated.View style={[s.barFill, { backgroundColor: color }, st]} />
    </View>
  );
}

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [demo, setDemo] = useState(false);
  const [cur, setCur] = useState('$');
  const [party, setParty] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [it, d, c] = await Promise.all([getItem(id!), getDemoMode(), getCurrency()]);
        setItem(it ?? null); setDemo(d); setCur(c);
      })();
    }, [id])
  );

  if (!item) return <View style={s.container} />;

  const deadline = deadlineFor(item, demo);
  const days = daysLeft(deadline);
  const color = urgencyColor(days);
  const total = demo ? 3 : item.returnWindowDays;
  const returnPct = 1 - Math.max(0, days) / Math.max(1, total);
  const we = warrantyEnd(item);
  const wDays = we ? daysLeft(we) : 0;
  const wTotal = item.warrantyMonths ? item.warrantyMonths * 30.4 : 1;
  const wPct = we ? 1 - Math.max(0, wDays) / wTotal : 0;
  const isActive = item.status === 'active';

  const markAs = async (status: Item['status']) => {
    const updated: Item = { ...item, status };
    await upsertItem(updated);
    if (status === 'active' || status === 'kept') await scheduleItemNotifications(updated, demo);
    else await cancelItemNotifications(updated.id);
    setItem(updated);
    track(status === 'returned' ? 'item_returned' : status === 'kept' ? 'item_kept' : 'item_reopened', { store: item.store });
    if (status === 'returned') {
      setParty(true);
      setTimeout(() => router.back(), 1800);
    }
  };

  const onDelete = () =>
    Alert.alert('Delete this item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await cancelItemNotifications(item.id);
          await deleteReceipt(item.receiptUri);
          await deleteItem(item.id);
          router.back();
        },
      },
    ]);

  const uri = receiptPath(item.receiptUri);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[s.bigBadge, { backgroundColor: isActive ? color : item.status === 'returned' ? C.good : C.primary }]}>
          <Text style={s.bigBadgeText}>
            {isActive ? (days < 0 ? 'RETURN WINDOW CLOSED' : days === 0 ? 'LAST DAY' : `${days} DAYS LEFT`) : item.status === 'returned' ? 'RETURNED ✓' : 'KEPT'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)}>
          <Text style={s.store}>{item.store}</Text>
          <Text style={s.name}>{item.itemName}</Text>
          {item.price != null && <Text style={s.price}>{money(cur, item.price)}</Text>}
        </Animated.View>

        {isActive && (
          <Animated.View entering={FadeInDown.delay(180).springify().damping(18)} style={s.block}>
            <Text style={s.blockTitle}>Return window</Text>
            <Bar pct={returnPct} color={color} />
            <Text style={s.blockSub}>Return by {formatDate(deadline)}{demo ? ' (demo: 3 days)' : ` · ${total} day window`}</Text>
          </Animated.View>
        )}

        {we && item.status !== 'returned' && (
          <Animated.View entering={FadeInDown.delay(260).springify().damping(18)} style={s.block}>
            <Text style={s.blockTitle}>Warranty</Text>
            <Bar pct={wPct} color={wDays <= 14 ? C.bad : wDays <= 60 ? C.warn : C.good} />
            <Text style={s.blockSub}>
              {wDays < 0 ? 'Expired' : `Covered until ${formatDate(we)}`} · {item.warrantyMonths} months
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(340).springify().damping(18)}>
          <View style={s.row}><Text style={s.rowLabel}>Purchased</Text><Text style={s.rowValue}>{formatDate(new Date(item.purchaseDate))}</Text></View>
        </Animated.View>

        {uri && <Animated.Image entering={FadeIn.delay(420)} source={{ uri }} style={s.receipt} />}

        {isActive ? (
          <Animated.View entering={FadeInDown.delay(480).springify()} style={s.actions}>
            <PressableScale style={[s.action, { backgroundColor: C.good }]} onPress={() => markAs('returned')}>
              <Text style={s.actionText}>✓ Returned</Text>
            </PressableScale>
            <PressableScale style={[s.action, { backgroundColor: C.primary }]} onPress={() => markAs('kept')}>
              <Text style={s.actionText}>Keep it</Text>
            </PressableScale>
          </Animated.View>
        ) : (
          item.status === 'kept' && (
            <PressableScale style={[s.action, { backgroundColor: C.card, marginTop: 24 }]} onPress={() => markAs('active')}>
              <Text style={s.actionText}>Move back to returns</Text>
            </PressableScale>
          )
        )}

        <PressableScale style={s.deleteBtn} onPress={onDelete}>
          <Text style={s.deleteText}>Delete</Text>
        </PressableScale>
      </ScrollView>

      {party && (
        <>
          <Confetti />
          <Animated.View entering={ZoomIn.springify().damping(12)} style={s.partyWrap} pointerEvents="none">
            <Text style={s.partyEmoji}>💸</Text>
            <Text style={s.partyText}>{item.price != null ? `${money(cur, item.price)} back!` : 'Return done!'}</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  bigBadge: { padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  bigBadgeText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  store: { color: C.sub, fontSize: 13, textTransform: 'uppercase' },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  price: { color: '#cbd5e1', fontSize: 16, marginTop: 4 },
  block: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 18 },
  blockTitle: { color: '#fff', fontWeight: '700', marginBottom: 10 },
  blockSub: { color: C.sub, fontSize: 13, marginTop: 8 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: C.border, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.card, marginTop: 8 },
  rowLabel: { color: C.sub },
  rowValue: { color: '#fff', fontWeight: '700' },
  receipt: { marginTop: 20, width: '100%', height: 260, borderRadius: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  action: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '800' },
  deleteBtn: { marginTop: 20, padding: 14, alignItems: 'center' },
  deleteText: { color: C.bad, fontWeight: '700' },
  partyWrap: { position: 'absolute', top: '32%', left: 0, right: 0, alignItems: 'center' },
  partyEmoji: { fontSize: 72 },
  partyText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 6 },
});
