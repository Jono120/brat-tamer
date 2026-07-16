# Mobile (Phase 4) — Deferred Checklist

Native mobile work was deferred until the web app was stable. The code-level items below are now
implemented; remaining manual steps (credentials, store consoles, device QA) are tracked in
[docs/MOBILE_RELEASE.md](MOBILE_RELEASE.md).

## OAuth deep links

- [x] Configure `redirectTo` using `com.carestickers.app://auth-callback` per `supabase/config.toml`
      (`src/lib/native.ts` + native branch in `loginWithProvider`)
- [x] Use `@capacitor/browser` for system-browser OAuth instead of in-WebView redirects
- [x] Add the custom scheme to Supabase Auth allowed redirect URLs (`config.toml`; dashboard
      allow-list is a manual step — see MOBILE_RELEASE.md §2)
- [ ] Test Google and Apple sign-in on iOS and Android physical devices (MOBILE_RELEASE.md §2)

## Build matrix

- [x] Set `VITE_API_BASE` per environment (staging vs production) in Capacitor build scripts
      (`build:cap:staging` / `build:cap:prod` + `.env.capacitor-*` files)
- [x] Document env file layout for `build:cap` in [DEVELOPMENT.md](DEVELOPMENT.md)

## Assets

- [x] Generate app icons and splash screens via `@capacitor/assets` (`npm run assets:generate`;
      placeholder art in `assets/` — replace with final branding per MOBILE_RELEASE.md §3)
- [ ] Verify safe-area insets on notched devices (helpers shipped; device QA in MOBILE_RELEASE.md §3)

## Push notifications

- [x] Integrate FCM (Android) and APNs (iOS) for native push — scaffold complete
      (`supabase/migrations/0007_push_tokens.sql`, `server/src/push.ts`, `/api/push/register`,
      `src/lib/nativePush.ts`); Firebase/APNs credentials are manual (MOBILE_RELEASE.md §4)
- [x] Bridge Web Push permission flow to native where appropriate (Settings toggle requests
      native permission and registers the device token)
- [x] Handle notification taps opening the Social tab (`pushNotificationActionPerformed` →
      `#/social`)

## Store submission

- [ ] App Store Connect listing (screenshots, privacy nutrition labels, review notes) — MOBILE_RELEASE.md §5
- [ ] Google Play Console listing (Data safety form, content rating) — MOBILE_RELEASE.md §5
- [x] Privacy policy URL (`/privacy.html` served from `public/`)
- [ ] TestFlight / internal testing track before public release — MOBILE_RELEASE.md §5
- [ ] Verify offline behaviour and session refresh in WebView — MOBILE_RELEASE.md §6

## References

- [docs/DEVELOPMENT.md](DEVELOPMENT.md) — Capacitor build scripts
- [docs/MOBILE_RELEASE.md](MOBILE_RELEASE.md) — release runbook (manual steps + device QA)
- `docs/SUPABASE.md` Capacitor / deep-link notes
- `supabase/config.toml` `additional_redirect_urls`
