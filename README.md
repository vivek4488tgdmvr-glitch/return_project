# Return — Hackathon Build

Return is a local-first purchase tracker that turns receipt photos into structured purchase data, calculates return deadlines, tracks warranties, and schedules reminder notifications.

## What is included

- AI receipt scanning → store, item, price, purchase date
- Retailer policy suggestions with editable return windows
- Manual purchase-date picker and warranty tracking
- 9:00 AM return + warranty reminder scheduling
- Receipt persistence in `FileSystem.documentDirectory` rather than the temporary cache
- Free-plan limit based only on active tracked items
- RevenueCat Pro paywall + purchase + restore flow
- PostHog-ready conversion events (`item_added`, `paywall_viewed`, `purchase_started`, `purchase`)
- Smooth Reanimated entrance, press, progress, countdown, paywall, and confetti animations
- Local-first AsyncStorage; no Supabase dependency is claimed
- Dark, mobile-first UI with ₹ as the default currency for the India demo

## Install

```bash
npm install
npx expo install
```

If Expo reports version mismatches, prefer `npx expo install` for Expo-managed packages.

## Environment

Copy `.env.example` to `.env`.

For the supplied hackathon RevenueCat **public/Test Store** key, use:

```env
EXPO_PUBLIC_RC_KEY=test_your_revenuecat_public_or_test_store_key
```

For release builds, set the platform-specific public keys instead:

```env
EXPO_PUBLIC_RC_IOS=appl_...
EXPO_PUBLIC_RC_ANDROID=goog_...
```

Never put a RevenueCat `sk_...` secret key in the app. RevenueCat documents public SDK keys for client configuration and secret keys as server-only. citeturn0search11

The receipt AI uses `EXPO_PUBLIC_OPENAI_KEY`. This client-side approach is suitable for a hackathon demo; for a public production release, proxy AI calls through your backend so the OpenAI key is not bundled into the application.

## RevenueCat dashboard

Configure:

1. Your Android/iOS app in the RevenueCat project.
2. A `pro` entitlement.
3. Your monthly/annual products attached to that entitlement.
4. A **Current** offering containing those packages.

The app reads `offerings.current` and displays its available packages.

RevenueCat's current Expo guidance requires a development build for real native purchases; Expo Go can preview subscription logic but does not perform real native purchases. citeturn0search0turn0search1

## Run the hackathon build

```bash
npx expo start --dev-client
```

Android development build:

```bash
eas build --platform android --profile development
```

Or locally if your Android environment is ready:

```bash
npx expo run:android
```

RevenueCat's Expo documentation recommends an Expo development build for testing native purchases. citeturn0search0

## Animation stack

The project uses `react-native-reanimated` for screen entrances, button press feedback, animated progress bars, pulsing urgency badges, paywall motion, and return-success confetti. Expo SDK 54 documents Reanimated 4.1.1 as the recommended version and supports installing it with `npx expo install`. citeturn0search3turn0search4

## Before submission

- Replace `com.return.app` with the exact application/bundle ID registered in your store/RevenueCat configuration.
- Use real platform-specific RevenueCat public keys in the release build; never ship a Test Store key to production. citeturn0search7
- Test purchase, restore, free-limit behavior, receipt scan, notification permission, and notification tap routing on a development build.
- Verify retailer return-window suggestions against the actual product/seller policy; the app treats them as editable defaults, not guarantees.
- For a production launch, move the OpenAI call behind a backend.
