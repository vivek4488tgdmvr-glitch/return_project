import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { getOffering, purchase, restore } from '../lib/purchases';
import { track } from '../lib/analytics';
import { C } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';
import { Confetti } from '../components/Confetti';

const PERKS = [
  ['♾️', 'Track unlimited items'],
  ['⏰', 'Return and warranty reminders at 9 AM'],
  ['🧾', 'AI receipt scanning'],
  ['🛡️', 'Warranty tracker for everything you keep'],
];

function Hero() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-8, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.Text style={[s.hero, st]}>💎</Animated.Text>;
}

export default function Paywall() {
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    track('paywall_viewed');
    (async () => {
      try {
        setPkgs(await getOffering());
      } catch (e: any) {
        Alert.alert('Could not load plans', e?.message ?? 'Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const finish = () => { setDone(true); setTimeout(() => router.back(), 1600); };

  const onBuy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    track('purchase_started', { package: pkg.identifier });
    try {
      if (await purchase(pkg)) {
        track('purchase', { package: pkg.identifier });
        finish();
      }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      if (await restore()) finish();
      else Alert.alert('Nothing to restore', 'We could not find an earlier purchase on this account.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center' }}><Hero /></View>
        <Animated.Text entering={FadeInDown.delay(100).springify()} style={s.h1}>Unlock Return Pro</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(180).springify()} style={s.sub}>Never lose money on a return again.</Animated.Text>

        <View style={{ marginBottom: 24 }}>
          {PERKS.map(([icon, text], i) => (
            <Animated.View key={text} entering={FadeInDown.delay(260 + i * 90).springify().damping(18)} style={s.perk}>
              <Text style={s.perkIcon}>{icon}</Text>
              <Text style={s.perkText}>{text}</Text>
            </Animated.View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : pkgs.length === 0 ? (
          <Text style={s.empty}>Plans aren't available right now. Check your RevenueCat key and offering, then try again.</Text>
        ) : (
          pkgs.map((pkg, i) => (
            <Animated.View key={pkg.identifier} entering={FadeInDown.delay(650 + i * 100).springify().damping(16)}>
              <PressableScale style={[s.pkg, pkg.packageType === 'ANNUAL' && s.pkgBest]} onPress={() => onBuy(pkg)} disabled={busy}>
                {pkg.packageType === 'ANNUAL' && <Text style={s.tag}>BEST VALUE</Text>}
                <Text style={s.pkgTitle}>{pkg.product.title || pkg.identifier}</Text>
                <Text style={s.pkgPrice}>{pkg.product.priceString}</Text>
              </PressableScale>
            </Animated.View>
          ))
        )}

        {busy && <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />}

        <PressableScale onPress={onRestore} disabled={busy}><Text style={s.link}>Restore purchases</Text></PressableScale>
        <PressableScale onPress={() => router.back()}><Text style={s.link}>Maybe later</Text></PressableScale>

        <Text style={s.fine}>Subscriptions renew automatically unless cancelled at least 24 hours before the period ends.</Text>
      </ScrollView>

      {done && (
        <>
          <Confetti />
          <Animated.View entering={ZoomIn.springify()} style={s.doneWrap} pointerEvents="none">
            <Text style={{ fontSize: 64 }}>🎉</Text>
            <Text style={s.doneText}>You're Pro!</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { fontSize: 64, marginTop: 8 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  sub: { color: C.sub, textAlign: 'center', marginTop: 6, marginBottom: 26 },
  perk: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 14, borderRadius: 12, marginBottom: 8 },
  perkIcon: { fontSize: 20, marginRight: 12 },
  perkText: { color: '#fff', fontWeight: '600', flex: 1 },
  pkg: { backgroundColor: C.card, padding: 20, borderRadius: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  pkgBest: { borderColor: C.primary },
  tag: { position: 'absolute', top: -10, left: 16, backgroundColor: C.primary, color: '#fff', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  pkgTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pkgPrice: { color: C.soft, fontSize: 16, fontWeight: '900' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 10 },
  link: { color: C.sub, textAlign: 'center', marginTop: 20, textDecorationLine: 'underline' },
  fine: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 24 },
  doneWrap: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
});
