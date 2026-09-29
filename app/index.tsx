import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  FadeInDown, FadeIn, LinearTransition, useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { Item } from '../lib/types';
import { loadItems, getDemoMode, getCurrency } from '../lib/storage';
import { deadlineFor, warrantyEnd, daysLeft, formatDate } from '../lib/date';
import { C, urgencyColor, money } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';
import { CountUp } from '../components/CountUp';

type Tab = 'returns' | 'warranty' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'returns', label: 'Returns' },
  { key: 'warranty', label: 'Warranties' },
  { key: 'history', label: 'History' },
];

type Row = { item: Item; sub: string; badge: string; color: string; pulse: boolean; sort: number };

function buildRows(tab: Tab, items: Item[], demo: boolean, cur: string): Row[] {
  if (tab === 'returns') {
    return items
      .filter((i) => i.status === 'active')
      .map((item) => {
        const dl = deadlineFor(item, demo);
        const d = daysLeft(dl);
        return {
          item, sort: d, color: urgencyColor(d), pulse: d >= 0 && d <= 2,
          badge: d < 0 ? 'EXPIRED' : d === 0 ? 'TODAY' : `${d}d`,
          sub: `Return by ${formatDate(dl)}`,
        };
      })
      .sort((a, b) => a.sort - b.sort);
  }
  if (tab === 'warranty') {
    return items
      .filter((i) => (i.status === 'active' || i.status === 'kept') && i.warrantyMonths)
      .map((item) => {
        const we = warrantyEnd(item)!;
        const d = daysLeft(we);
        return {
          item, sort: d, pulse: false,
          color: d <= 14 ? C.bad : d <= 60 ? C.warn : C.good,
          badge: d >= 60 ? `${Math.round(d / 30)}mo` : `${d}d`,
          sub: `Covered until ${formatDate(we)}`,
        };
      })
      .filter((r) => r.sort >= 0)
      .sort((a, b) => a.sort - b.sort);
  }
  return items
    .filter((i) => i.status === 'returned' || i.status === 'kept')
    .map((item) => ({
      item, sort: -new Date(item.createdAt).getTime(), pulse: false,
      color: item.status === 'returned' ? C.good : C.primary,
      badge: item.status === 'returned' ? 'RETURNED' : 'KEPT',
      sub: item.price != null ? money(cur, item.price) : formatDate(new Date(item.purchaseDate)),
    }))
    .sort((a, b) => a.sort - b.sort);
}

function Segments({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const idx = TABS.findIndex((t) => t.key === tab);
  useEffect(() => { x.value = withSpring(idx * w, { damping: 18, stiffness: 180 }); }, [idx, w]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={s.seg} onLayout={(e) => setW((e.nativeEvent.layout.width - 8) / TABS.length)}>
      <Animated.View style={[s.segInd, { width: w }, ind]} />
      {TABS.map((t) => (
        <PressableScale key={t.key} scaleTo={0.94} style={[s.segBtn, { width: w }]} onPress={() => setTab(t.key)}>
          <Text style={[s.segText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

function RowCard({ row, index, cur, onPress }: { row: Row; index: number; cur: string; onPress: () => void }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (row.pulse) {
      pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
    }
  }, [row.pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify().damping(18)} layout={LinearTransition}>
      <PressableScale style={s.card} onPress={onPress}>
        <View style={[s.strip, { backgroundColor: row.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.store}>{row.item.store}</Text>
          <Text style={s.name}>{row.item.itemName}</Text>
          <Text style={s.date}>{row.sub}</Text>
        </View>
        <Animated.View style={[s.badge, { backgroundColor: row.color }, pulseStyle]}>
          <Text style={s.badgeText}>{row.badge}</Text>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

function Floating({ children }: { children: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-10, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.Text style={[{ fontSize: 56 }, st]}>{children}</Animated.Text>;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [demo, setDemo] = useState(false);
  const [cur, setCur] = useState('₹');
  const [tab, setTab] = useState<Tab>('returns');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [its, d, c] = await Promise.all([loadItems(), getDemoMode(), getCurrency()]);
        setItems(its); setDemo(d); setCur(c); setLoading(false);
      })();
    }, [])
  );

  const rows = useMemo(() => buildRows(tab, items, demo, cur), [tab, items, demo, cur]);

  const summary = useMemo(() => {
    if (tab === 'returns') {
      const live = rows.filter((r) => r.sort >= 0);
      const value = live.reduce((a, r) => a + (r.item.price ?? 0), 0);
      const soon = live.filter((r) => r.sort <= 7).length;
      return { label: 'Still returnable', value, prefix: cur, foot: soon ? `${soon} closing this week` : 'Nothing closing this week' };
    }
    if (tab === 'warranty') {
      return { label: 'Items under warranty', value: rows.length, prefix: '', foot: 'We remind you 30 and 7 days before cover ends' };
    }
    const saved = rows.filter((r) => r.item.status === 'returned').reduce((a, r) => a + (r.item.price ?? 0), 0);
    return { label: 'Money back so far', value: saved, prefix: cur, foot: `${rows.length} items closed out` };
  }, [tab, rows, cur]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#fff" /></View>;
  }

  return (
    <View style={s.container}>
      <FlatList
        key={tab}
        data={rows}
        keyExtractor={(r) => r.item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeIn.duration(500)} style={s.summary}>
              <Text style={s.sumLabel}>{summary.label}</Text>
              <CountUp value={summary.value} prefix={summary.prefix} style={s.sumValue} />
              <Text style={s.sumFoot}>{summary.foot}</Text>
            </Animated.View>
            <Segments tab={tab} setTab={setTab} />
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(150)} style={s.empty}>
            <Floating>{tab === 'returns' ? '🧾' : tab === 'warranty' ? '🛡️' : '📦'}</Floating>
            <Text style={s.emptyTitle}>
              {tab === 'returns' ? 'No open returns' : tab === 'warranty' ? 'No warranties tracked' : 'Nothing here yet'}
            </Text>
            <Text style={s.emptySub}>
              {tab === 'history' ? 'Items you return or keep show up here.' : 'Tap Add Item and snap a receipt.'}
            </Text>
          </Animated.View>
        }
        renderItem={({ item: row, index }) => (
          <RowCard row={row} index={index} cur={cur} onPress={() => router.push(`/item/${row.item.id}`)} />
        )}
      />

      <Animated.View entering={FadeInDown.delay(300).springify()} style={s.footer}>
        <PressableScale style={s.iconBtn} onPress={() => router.push('/settings')}>
          <Text style={s.iconText}>⚙️</Text>
        </PressableScale>
        <PressableScale style={s.addBtn} onPress={() => router.push('/add')}>
          <Text style={s.addText}>+ Add Item</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  summary: { backgroundColor: C.primary, borderRadius: 20, padding: 20, marginBottom: 14 },
  sumLabel: { color: '#e0e7ff', fontSize: 13, fontWeight: '600' },
  sumValue: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 2 },
  sumFoot: { color: '#c7d2fe', fontSize: 13, marginTop: 2 },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginBottom: 16 },
  segInd: { position: 'absolute', top: 4, left: 4, height: 38, borderRadius: 10, backgroundColor: C.border },
  segBtn: { height: 38, justifyContent: 'center', alignItems: 'center' },
  segText: { color: C.sub, fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', backgroundColor: C.card, padding: 16, paddingLeft: 20, borderRadius: 14, marginBottom: 12, alignItems: 'center', overflow: 'hidden' },
  strip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  store: { color: C.sub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  date: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 8 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 12 },
  emptySub: { color: C.sub, marginTop: 6, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.card },
  iconBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 22 },
  addBtn: { flex: 1, height: 56, backgroundColor: C.primary, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  addText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
