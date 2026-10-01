import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Animated, {
  FadeInDown, FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { Item } from '../lib/types';
import { upsertItem, activeCount, getDemoMode, getCurrency } from '../lib/storage';
import { getIsPro } from '../lib/purchases';
import { scheduleItemNotifications } from '../lib/notifications';
import { extractReceipt, aiAvailable } from '../lib/ai';
import { policyFor } from '../lib/policies';
import { persistReceipt } from '../lib/files';
import { deadlineFor, daysLeft, formatDate } from '../lib/date';
import { track } from '../lib/analytics';
import { C, urgencyColor } from '../lib/theme';
import { PressableScale } from '../components/PressableScale';

const FREE_LIMIT = 3;
const WINDOW_CHIPS = ['14', '30', '60', '90'];

function Field({ label, i, children }: { label: string; i: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(i * 45).springify().damping(18)}>
      <Text style={s.label}>{label}</Text>
      {children}
    </Animated.View>
  );
}

function ScanOverlay() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(216, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={s.scanWrap} pointerEvents="none">
      <Animated.View style={[s.scanLine, line]} />
      <View style={s.scanLabel}>
        <ActivityIndicator color="#fff" size="small" />
        <Text style={s.scanText}>Reading receipt…</Text>
      </View>
    </View>
  );
}

export default function Add() {
  const router = useRouter();
  const [store, setStore] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [windowDays, setWindowDays] = useState('30');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [cur, setCur] = useState('₹');
  const [scanning, setScanning] = useState(false);
  const [aiNote, setAiNote] = useState<'ok' | 'fail' | 'off' | null>(null);
  const [saving, setSaving] = useState(false);
  const windowTouched = useRef(false);
  const warrantyTouched = useRef(false);

  useEffect(() => { getCurrency().then(setCur); }, []);

  const applyPolicy = (name: string) => {
    const p = policyFor(name);
    if (!p) return;
    if (!windowTouched.current) setWindowDays(String(p.days));
    if (p.warranty && !warrantyTouched.current) setWarrantyMonths(String(p.warranty));
  };

  const onStore = (t: string) => { setStore(t); applyPolicy(t); };

  const scan = async (source: 'camera' | 'library') => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add a receipt.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { quality: 0.5, base64: true, mediaTypes: ['images'] };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;

    const asset = res.assets[0];
    setReceiptUri(asset.uri);
    setAiNote(null);
    if (!aiAvailable) { setAiNote('off'); return; }
    if (!asset.base64) { setAiNote('fail'); return; }

    setScanning(true);
    let out = null;
    try {
      out = await extractReceipt(asset.base64);
    } finally {
      setScanning(false);
    }
    if (!out) { setAiNote('fail'); track('receipt_scan_failed'); return; }

    if (out.store) { setStore(out.store); applyPolicy(out.store); }
    if (out.itemName) setItemName(out.itemName);
    if (out.price != null) setPrice(String(out.price));
    if (out.purchaseDate) setPurchaseDate(out.purchaseDate);
    setAiNote('ok');
    track('receipt_scanned', { store: out.store });
  };

  const chooseSource = () =>
    Alert.alert('Add receipt', undefined, [
      { text: 'Take photo', onPress: () => scan('camera') },
      { text: 'Choose from library', onPress: () => scan('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: purchaseDate, mode: 'date', maximumDate: new Date(),
      onChange: (_, d) => d && setPurchaseDate(d),
    });

  const days = parseInt(windowDays || '0', 10) || 0;
  const preview = new Date(purchaseDate);
  preview.setDate(preview.getDate() + days);
  const left = daysLeft(preview);

  const onSave = async () => {
    if (!store.trim() || !itemName.trim()) {
      Alert.alert('Missing details', 'Add the store and the item name.');
      return;
    }
    setSaving(true);
    try {
      const isPro = await getIsPro();
      if (!isPro && (await activeCount()) >= FREE_LIMIT) {
        router.push('/paywall');
        return;
      }
      const id = Crypto.randomUUID();
      const parsedPrice = price.trim() ? Number(price.replace(/,/g, '')) : undefined;
      const parsedWindow = Number.parseInt(windowDays, 10);
      const parsedWarranty = warrantyMonths.trim() ? Number.parseInt(warrantyMonths, 10) : undefined;
      if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        Alert.alert('Check the price', 'Enter a valid non-negative price.');
        return;
      }
      if (!Number.isFinite(parsedWindow) || parsedWindow < 1 || parsedWindow > 3650) {
        Alert.alert('Check the return window', 'Use a return window between 1 and 3650 days.');
        return;
      }
      if (parsedWarranty !== undefined && (!Number.isFinite(parsedWarranty) || parsedWarranty < 1 || parsedWarranty > 240)) {
        Alert.alert('Check the warranty', 'Use warranty months between 1 and 240.');
        return;
      }
      const stored = receiptUri ? await persistReceipt(receiptUri, id) : undefined;
      const noon = new Date(purchaseDate);
      noon.setHours(12, 0, 0, 0);

      const item: Item = {
        id,
        store: store.trim(),
        itemName: itemName.trim(),
        price: parsedPrice,
        purchaseDate: noon.toISOString(),
        returnWindowDays: parsedWindow,
        warrantyMonths: parsedWarranty,
        receiptUri: stored,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await upsertItem(item);
      await scheduleItemNotifications(item, await getDemoMode());
      track('item_added', { store: item.store, has_receipt: !!stored, has_warranty: !!item.warrantyMonths });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <PressableScale style={s.scanBtn} onPress={chooseSource}>
          <Text style={s.scanBtnTitle}>{receiptUri ? '📸 Scan a different receipt' : '✨ Scan receipt'}</Text>
          <Text style={s.scanBtnSub}>We fill in the store, item, price and date for you</Text>
        </PressableScale>
      </Animated.View>

      {receiptUri && (
        <Animated.View entering={ZoomIn.springify().damping(16)} style={s.previewWrap}>
          <Image source={{ uri: receiptUri }} style={s.preview} />
          {scanning && <ScanOverlay />}
        </Animated.View>
      )}

      {aiNote === 'ok' && <Animated.Text entering={ZoomIn} style={[s.note, { color: C.good }]}>✓ Filled from your receipt - check it looks right</Animated.Text>}
      {aiNote === 'fail' && <Animated.Text entering={FadeIn} style={[s.note, { color: C.warn }]}>Couldn't read that receipt. Fill it in below.</Animated.Text>}
      {aiNote === 'off' && <Animated.Text entering={FadeIn} style={[s.note, { color: C.sub }]}>Receipt reading isn't set up yet. Fill it in below.</Animated.Text>}

      <Field label="Store" i={1}>
        <TextInput style={s.input} value={store} onChangeText={onStore} placeholder="Amazon" placeholderTextColor={C.muted} />
      </Field>
      <Field label="Item name" i={2}>
        <TextInput style={s.input} value={itemName} onChangeText={setItemName} placeholder="Sony WH-1000XM5" placeholderTextColor={C.muted} />
      </Field>
      <Field label={`Price (${cur})`} i={3}>
        <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="349.99" placeholderTextColor={C.muted} />
      </Field>

      <Field label="Purchase date" i={4}>
        <View style={s.dateRow}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={purchaseDate} mode="date" display="compact" themeVariant="dark" maximumDate={new Date()} onChange={(_, d) => d && setPurchaseDate(d)} />
          ) : (
            <PressableScale style={s.dateBtn} onPress={openAndroidPicker}>
              <Text style={s.dateText}>{formatDate(purchaseDate)}</Text>
            </PressableScale>
          )}
        </View>
      </Field>

      <Field label="Return window (days)" i={5}>
        <TextInput
          style={s.input} value={windowDays} keyboardType="number-pad" placeholder="30" placeholderTextColor={C.muted}
          onChangeText={(t) => { windowTouched.current = true; setWindowDays(t); }}
        />
        <View style={s.chips}>
          {WINDOW_CHIPS.map((c) => (
            <PressableScale key={c} scaleTo={0.9} style={[s.chip, windowDays === c && s.chipOn]} onPress={() => { windowTouched.current = true; setWindowDays(c); }}>
              <Text style={[s.chipText, windowDays === c && { color: '#fff' }]}>{c}d</Text>
            </PressableScale>
          ))}
        </View>
      </Field>

      <Field label="Warranty (months, optional)" i={6}>
        <TextInput
          style={s.input} value={warrantyMonths} keyboardType="number-pad" placeholder="12" placeholderTextColor={C.muted}
          onChangeText={(t) => { warrantyTouched.current = true; setWarrantyMonths(t); }}
        />
      </Field>

      {days > 0 && (
        <Animated.View entering={FadeIn} style={[s.deadline, { borderColor: urgencyColor(left) }]}>
          <Text style={s.deadlineText}>
            Return by {formatDate(preview)} · {left < 0 ? 'already passed' : left === 0 ? 'last day is today' : `${left} days left`}
          </Text>
        </Animated.View>
      )}

      <PressableScale style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        <Text style={s.saveText}>{saving ? 'Saving…' : 'Save item'}</Text>
      </PressableScale>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scanBtn: { backgroundColor: C.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
  scanBtnTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scanBtnSub: { color: '#c7d2fe', fontSize: 12, marginTop: 3 },
  previewWrap: { marginTop: 14, borderRadius: 12, overflow: 'hidden', height: 220 },
  preview: { width: '100%', height: 220 },
  scanWrap: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,23,42,0.45)' },
  scanLine: { height: 3, backgroundColor: '#818cf8', shadowColor: '#818cf8', shadowOpacity: 1, shadowRadius: 10, elevation: 8 },
  scanLabel: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  scanText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  note: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  label: { color: C.sub, fontSize: 12, textTransform: 'uppercase', marginTop: 16, marginBottom: 6, letterSpacing: 0.6 },
  input: { backgroundColor: C.card, color: '#fff', padding: 14, borderRadius: 10, fontSize: 16 },
  dateRow: { alignItems: 'flex-start' },
  dateBtn: { backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  dateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipOn: { backgroundColor: C.primary },
  chipText: { color: C.sub, fontWeight: '700' },
  deadline: { marginTop: 20, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  deadlineText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  saveBtn: { marginTop: 24, backgroundColor: C.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
