# Elevator Field (Expo + WebView)

This is a **React Native** shell (via **Expo**) that shows your web app inside a **`WebView`**. It is **not** a rewrite of the UI in React Native components—only the native wrapper is RN.

- **Earlier note:** *Capacitor* (Ionic) is a different tool; it solves the same “website in an app” idea. **React Native** + `react-native-webview` is the RN-native way to do that hybrid.

## Run on your iPhone (Expo Go)

1. **Install Expo Go** from the App Store on the iPhone.

2. On your **Mac**, start the Next app so the phone can reach it:
   - From the repo root: `npm run dev:lan` (listens on `0.0.0.0` so LAN devices can connect), or `npm run dev -- -H 0.0.0.0`.

3. **LAN IP of your Mac** (Wi‑Fi), e.g.:
   ```bash
   ipconfig getifaddr en0
   ```
   Use something like `http://THAT_IP:3000` (not `http://localhost:3000`—on the phone, “localhost” is the phone itself).

4. In **`mobile-field/`**, copy env and edit the URL:
   ```bash
   cd mobile-field
   cp .env.example .env
   # Edit .env → EXPO_PUBLIC_WEB_APP_URL=http://YOUR_IP:3000
   ```

5. Start Expo:
   ```bash
   npm run start
   ```
   When the dev tools open, press **`i`** for iOS simulator, or scan the **QR code** with the **Camera** app — open in **Expo Go**. Phone and Mac must be on the **same Wi‑Fi**.

6. If the WebView is blank, check: Mac firewall allows Node, correct IP/port, Next is bound to `0.0.0.0`.

### Native “Geri” and Android system back

**‹ Geri** appears only when **both** the WebView can go back **and** the URL is **not** the dashboard (`/app`), home (`/`), login, signup, or `/auth/*` — so you don’t get a back affordance on the main panel after login. **Android hardware back** follows the same rule; **iOS** still has **edge swipe** when history allows it.

The native strip uses **`pointerEvents="box-none"`** so only the “Geri” control receives touches and the rest of the row does **not** block taps on the web header underneath.

### Login works in Safari but not in Expo Go

Embedded **WebViews** (especially **iOS WKWebView**) can lag behind on **httpOnly session cookies** when the app uses client-side navigation (`router.push`) right after `fetch` / Supabase sign-in. The app now forces a **full page load** to `/app` when it detects `window.ReactNativeWebView`, and local login `fetch` uses `credentials: "include"`. If you still see issues with **Supabase**, confirm `NEXT_PUBLIC_SUPABASE_URL` is reachable from the phone and that no corporate filter blocks your project domain.

### Expo Go: spinner → “problem running the requested app”

That almost always means the **phone never reached Metro** (JavaScript bundler on your Mac), not the WebView URL.

1. **Try tunnel mode** (works even when LAN/Wi‑Fi blocks device-to-Mac ports):
   ```bash
   cd mobile-field && npm run start:tunnel
   ```
   `@expo/ngrok` is included in this folder’s `package.json` so Expo does **not** need a global `npm install -g` (which often fails with permission errors). Scan the new QR code; the first tunnel can take a minute.

2. **LAN checklist:** iPhone and Mac on the **same Wi‑Fi**; **VPN** and **iCloud Private Relay** off on the phone for testing; **macOS Firewall** allows **Node** (incoming).

3. **Expo Go** must be **up to date** in the App Store (must match SDK 54 for this project).

4. Clear Metro cache and retry: `npx expo start -c` (optionally use free port **8081**: quit other Metro/Expo using that port).

This project sets **`newArchEnabled`: false** so the bundle matches typical **Expo Go** expectations.

### Tunnel: `failed to start tunnel` / `remote gone away`

Expo’s **`--tunnel`** mode does **not** use your personal ngrok account. The CLI connects through Expo’s **`*.exp.direct`** infrastructure (its own ngrok relationship). Your `ngrok config add-authtoken` / `NGROK_AUTHTOKEN` do **not** replace that path, so failures here are almost always **Expo↔ngrok** connectivity or **your network** (VPN, strict firewall, captive Wi‑Fi), not a missing token on your side.

1. **Prefer LAN** (below): no Expo tunnel, no ngrok in the middle.
2. **Retry** later; check [ngrok status](https://status.ngrok.com/) and [Expo status](https://status.expo.dev/) if it persists.
3. **Turn off VPN** on the Mac; try another network (e.g. phone hotspot) if you suspect blocking.
4. **`npx expo login`** — occasionally helps with tunnel stability when anonymous access is flaky.

**LAN (recommended for local devices):** same Wi‑Fi, from repo root `npm run dev:lan`, then `cd mobile-field && npm run start:lan`. In Expo Go you can also **Enter URL manually** using the `exp://…` line Metro prints (your Mac’s LAN IP, not `localhost`).

## Production

Point `EXPO_PUBLIC_WEB_APP_URL` at your deployed HTTPS URL (e.g. `https://app.yourcompany.com`). For App Store builds you would use **EAS Build** (`eas build`) and optionally remove or tighten `NSAllowsLocalNetworking` if you only use HTTPS.
