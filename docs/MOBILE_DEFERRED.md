# Mobile (Phase 4) — Deferred Checklist

Native mobile work is intentionally deferred until the web app is stable. Track these items when starting Capacitor builds.

## OAuth deep links

- [ ] Configure `redirectTo` using `com.carestickers.app://auth-callback` per `supabase/config.toml`
- [ ] Use `@capacitor/browser` for system-browser OAuth instead of in-WebView redirects
- [ ] Add the custom scheme to Supabase Auth allowed redirect URLs (dashboard + `config.toml`)
- [ ] Test Google and Apple sign-in on iOS and Android physical devices

## Build matrix

- [ ] Set `VITE_API_BASE` per environment (staging vs production) in Capacitor build scripts
- [ ] Document env file layout for `build:cap` in README

## Assets

- [ ] Generate app icons and splash screens via `@capacitor/assets`
- [ ] Verify safe-area insets on notched devices

## Push notifications

- [ ] Integrate FCM (Android) and APNs (iOS) for native push
- [ ] Bridge Web Push permission flow to native where appropriate
- [ ] Handle notification taps opening the Social tab

## Store submission

- [ ] App Store Connect listing (screenshots, privacy nutrition labels, review notes)
- [ ] Google Play Console listing (Data safety form, content rating)
- [ ] Privacy policy URL (`/privacy.html` or hosted equivalent)
- [ ] TestFlight / internal testing track before public release
- [ ] Verify offline behaviour and session refresh in WebView

## References

- Root `README.md` mobile section
- `docs/SUPABASE.md` Capacitor / deep-link notes
- `supabase/config.toml` `additional_redirect_urls`
