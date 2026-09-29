# Return — 10/10 submission checklist

- [ ] Install dependencies with `npm install`.
- [ ] Copy `.env.example` to `.env`; the supplied public/Test Store RevenueCat key is already present in the included `.env`.
- [ ] In RevenueCat, create entitlement `pro` and a Current offering with monthly/annual packages.
- [ ] For real store testing, replace the Test Store key with the correct Android/iOS public SDK key and use a development build.
- [ ] Test receipt photo → AI extraction → retailer suggestion → purchase date → save.
- [ ] Test return notifications at 9:00 AM and warranty notifications at 9:00 AM.
- [ ] Test returned/kept items no longer count toward the Free active-item limit.
- [ ] Test receipt survives an app restart because it is copied into documentDirectory.
- [ ] Test purchase + restore in the RevenueCat development build.
- [ ] Before release, move the OpenAI request behind a backend and remove the client-side OpenAI key.
- [ ] Replace `com.return.app` with the exact store application ID registered in your accounts.
