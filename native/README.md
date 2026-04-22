# Native apps (iOS + Android)

These are **platform-native** shells (SwiftUI and Jetpack Compose) that talk to the **same Supabase project** as the Next.js web app: **Auth**, **PostgREST**, **RLS**, and **Storage** use the same URLs and anon key as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Important: local-only web auth

If your web app runs in **local-only** mode (Supabase env vars empty, JWT via `/api/auth/local/login`), the database is still Postgres but **mobile cannot use that cookie flow**. For native apps you should:

- Use **Supabase Auth** in production (recommended), or
- Add a **small HTTPS API** later that issues tokens for mobile (out of scope for this scaffold).

The scaffolds below assume **Supabase is configured** the same way as in `.env.local.example` for the web app.

## Feature parity

The web app has many screens. This repo adds **native projects** with:

- Email / password sign-in (Supabase)
- Session persistence
- A **workspace home** list: `tenant_members` (your roles / tenants), proving RLS and multi-tenant wiring

Porting each feature (customers, assets, work orders, …) is incremental work: same tables and policies, new UI per screen.

## iOS (SwiftUI + Xcode)

Path: `native/ios/ElevatorField/`

1. Install [Xcode](https://developer.apple.com/xcode/) (required to build and ship iOS).
2. Optional but convenient: `brew install xcodegen`
3. Copy config and add real values:

   ```bash
   cd native/ios/ElevatorField
   cp ElevatorField/Config/Local.example.xcconfig ElevatorField/Config/Local.xcconfig
   # Edit Local.xcconfig — use the same URL and anon key as the web app
   ```

4. Generate the Xcode project (if using XcodeGen):

   ```bash
   xcodegen generate
   open ElevatorField.xcodeproj
   ```

   If you do **not** use XcodeGen: create a new **iOS App** project in Xcode (SwiftUI), add the Swift Package `https://github.com/supabase/supabase-swift` (product **Supabase**), then add the files under `ElevatorField/` to the target and attach the same `*.xcconfig` files to Debug/Release.

5. Set your **Team** and bundle identifier in Xcode for device runs and App Store builds.

## Android (Kotlin + Compose)

Path: `native/android/`

1. Install [Android Studio](https://developer.android.com/studio) and a **JDK 17** (Android Studio bundles one).
2. Copy secrets for Gradle:

   ```bash
   cd native/android
   cp local.properties.example local.properties
   # Edit local.properties — set sdk.dir (Android Studio often fills this) and supabaseUrl / supabaseAnonKey
   ```

3. Open the `native/android` folder in Android Studio, sync Gradle, run on an emulator or device.

From a terminal (with JDK 17 on `PATH`): `./gradlew :app:assembleDebug`

Minimum SDK is **26** (required by supabase-kt). Use a **publishable anon key** only; never ship the service role key.

## Security

- Treat `Local.xcconfig` / `local.properties` like `.env.local`: **do not commit** real keys.
- App Store / Play Store builds should use **project-specific** API keys if you rotate or restrict by platform later (Supabase supports multiple anon keys in newer projects).
