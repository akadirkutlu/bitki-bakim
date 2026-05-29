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

Photo flow currently sends image URI text as hint to backend (`/plants/identify`).
It returns narrowed candidate plant types using heuristic scoring.

Next step: replace with a real vision model integration and/or curated plant image embedding search.

## Monetization Hook

Free users can add up to 5 plants. On the 6th attempt API returns:
- HTTP `402`
- code: `FREE_LIMIT_REACHED`

You can connect this response to real in-app subscription flow later.
