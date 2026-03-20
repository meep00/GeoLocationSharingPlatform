# GeoLocationSharingPlatform

MVP monorepo for a travel geolocation sharing platform with:

- Mobile app (`mobile`, Expo/React Native scaffold)
- API gateway (`backend/gateway`)
- Auth users service (`backend/auth-users-service`)
- Tours service (`backend/tours-service`)
- Location service (`backend/location-service`)
- Shared contracts (`backend/shared`)

## Quick start

1. Copy env file:
   - `copy .env.example .env` (Windows PowerShell)
2. Install dependencies:
   - `npm install`
3. Start infrastructure and backend services:
   - `docker compose up --build`

## Local run without Docker (e.g. Supabase)

1. Set DB in `.env` (use Supabase session pooler host and `POSTGRES_SSL=true`).
2. Set local service URLs in `.env`:
   - `AUTH_SERVICE_URL=http://localhost:3001`
   - `TOURS_SERVICE_URL=http://localhost:3002`
   - `LOCATION_SERVICE_URL=http://localhost:3003`
3. Start services in separate terminals:
   - `npm run start:auth`
   - `npm run start:tours`
   - `npm run start:location`
   - `npm run start:gateway`

## Services and ports

- Gateway: `http://localhost:3000`
- Auth Users: `http://localhost:3001`
- Tours: `http://localhost:3002`
- Location: `http://localhost:3003`
- PostgreSQL: `localhost:5432`

## Mobile app (Expo emulator)

1. Start backend services first (see local run section above).
2. Start Expo app:
   - `npm run -w mobile android` (Android emulator)
   - `npm run -w mobile ios` (iOS simulator)
3. In the app, set **Gateway URL**:
   - Android emulator: `http://10.0.2.2:3000`
   - iOS simulator: `http://localhost:3000`
4. Use the in-app auth form to register/login as `guide` or `tourist`, then:
   - guide can create tours, update status, add/delete meeting points and POI
   - tourist can join tours by code and view meeting points/POI

## Auth API (via gateway)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT required)

## Role protected endpoint example

- `POST /api/tours` requires `guide` role.
