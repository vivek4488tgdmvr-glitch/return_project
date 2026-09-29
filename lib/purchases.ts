import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { getForcePro } from './storage';

// Public SDK/Test Store keys are safe to ship in the client. Never put a RevenueCat secret
// key (sk_...) in this file or in EXPO_PUBLIC_* variables.
const SHARED_KEY = process.env.EXPO_PUBLIC_RC_KEY ?? '';
const API_KEY_IOS = process.env.EXPO_PUBLIC_RC_IOS ?? '';
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_ANDROID ?? '';

export const ENTITLEMENT = 'pro';
let configured = false;

function keyForPlatform() {
  if (__DEV__ && SHARED_KEY) return SHARED_KEY;
  return Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
}

export async function initPurchases(): Promise<void> {
  if (configured) return;
  const apiKey = keyForPlatform();
  if (!apiKey) {
    console.warn('RevenueCat key missing. Set EXPO_PUBLIC_RC_KEY for Test Store or platform-specific public keys for release.');
    return;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey });
  configured = true;
}

export async function getIsPro(): Promise<boolean> {
  if (__DEV__ && (await getForcePro())) return true;
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function getOffering(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  if (!configured) throw new Error('RevenueCat is not configured for this build.');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo.entitlements.active[ENTITLEMENT];
}

export async function restore(): Promise<boolean> {
  if (!configured) throw new Error('RevenueCat is not configured for this build.');
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active[ENTITLEMENT];
}
