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

## Monetization Hook

Free users can add up to 5 plants. On the 6th attempt API returns:
- HTTP `402`
- code: `FREE_LIMIT_REACHED`

You can connect this response to real in-app subscription flow later.
