# Bitki Bakim (React Native + Node.js)

Cross-platform (iOS + Android) MVP for home plant care:
- Login/Register
- Add plants manually or with photo-assisted candidate matching
- Free plan limit: 5 plants
- Turkish-first localization (`tr` default, `en` optional toggle)
- Calendar-style upcoming reminders
- Local push notification scheduling

## Project Structure

- `mobile`: Expo React Native app (TypeScript)
- `backend`: Node.js + Express API (TypeScript)

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs at `http://localhost:4000`.

## Mobile Setup

```bash
cd mobile
npm install
npm run start
```

For Android emulator API calls, app uses `http://10.0.2.2:4000`.
For iOS simulator API calls, app uses `http://localhost:4000`.

## Current AI Identification

Photo identification uses the free [Pl@ntNet API](https://my.plantnet.org/) when `PLANTNET_API_KEY` is set in `backend/.env` (500 identifications/day on the free tier).

1. Create an account at [my.plantnet.org](https://my.plantnet.org/)
2. Generate an API key under Settings
3. Add `PLANTNET_API_KEY=...` to `backend/.env` and restart the backend

The mobile app sends the photo as base64; the backend maps Pl@ntNet results to supported plant types via heuristic scoring.

Free-tier use requires Pl@ntNet attribution — see their [terms of use](https://my.plantnet.org/terms_of_use).

Without `PLANTNET_API_KEY`, photo identification is unavailable and the app falls back to manual search.

## Monetization

Free users can add up to 5 plants. On the 6th attempt the API returns:
- HTTP `402`
- code: `PLAN_LIMIT_REACHED`

Premium (unlimited plants) is unlocked via an Apple auto-renewable subscription (`com.bitkibakim.app.premium.monthly`).

### Backend Apple IAP env vars

Set these in `backend/.env` (see `backend/.env.example`):

- `APPLE_BUNDLE_ID`, `APPLE_APP_ID`, `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- `APPLE_ENVIRONMENT=Sandbox` for TestFlight/sandbox testing
- `APPLE_PREMIUM_PRODUCT_IDS=com.bitkibakim.app.premium.monthly`

Webhook URL for App Store Server Notifications V2:

`POST https://<your-backend>/webhooks/apple/subscriptions`

### Mobile IAP testing (TestFlight)

1. Create the subscription product in App Store Connect (Ready to Submit).
2. Add a sandbox tester account on the device.
3. Rebuild the iOS app after installing `expo-iap` (IAP does not work in Expo Go):

```bash
cd mobile
eas build --platform ios --profile production
```

4. Optional: override product id via `EXPO_PUBLIC_PREMIUM_PRODUCT_ID` in `eas.json` env.
