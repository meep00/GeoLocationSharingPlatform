# Manual Test Checklist

## Prerequisites

1. Create `.env` file in project root (see `.env.example`).
2. Start all backend services in separate terminals:
   ```
   npm run start:auth
   npm run start:tours
   npm run start:location
   npm run start:gateway
   ```
3. Start the mobile app:
   ```
   cd mobile
   npx expo start --android
   ```
4. In Android Studio emulator, the default gateway URL `http://10.0.2.2:3000` should work.

---

## F1 / F9 — Registration and Login

- [ ] Open the app, see the AuthScreen with "Sign In" and "Sign Up" tabs.
- [ ] Switch to "Sign Up" tab. Role selector (Tourist / Guide) appears.
- [ ] Register a **guide** account (email + password + Guide role). Toast shows "Registered successfully".
- [ ] Logout (Home screen > logout icon).
- [ ] Register a **tourist** account with a different email. Toast shows success.
- [ ] Logout. Log back in with guide credentials. Toast shows "Logged in".
- [ ] Log back in with tourist credentials. Verify role shown as "Tourist" in user card.

## F2 — Create Tour (Guide)

- [ ] Logged in as guide. Press "Create Tour" button on Home.
- [ ] Fill in tour name and optional description. Press "Create".
- [ ] Tour appears in "My Tours" list with status badge "Planned" and a join code.
- [ ] Tour is auto-selected (blue highlight, summary card visible).

## F3 — Tour List

- [ ] Create multiple tours as guide. All appear in list with correct status badges.
- [ ] Press "Refresh" button. List reloads.
- [ ] Tap on a tour card to select it. Confirm it highlights and summary updates.

## F4 — Start and End Tour (Guide)

- [ ] Select a planned tour, go to Manage tab.
- [ ] Tap "Active" status chip. Tour status changes to Active.
- [ ] Tap "Ended" status chip. Tour status changes to Ended.
- [ ] Back on Home, the tour list shows updated status badges.

## F5 — Guide Location Sharing (Real-time)

- [ ] As guide, select an active tour and open Map tab.
- [ ] Press "Start Tracking". Toast shows "Live tracking enabled".
- [ ] Status bar shows "Subscribed to tour" with green dot.
- [ ] Guide marker (green circle with navigate icon) appears on map.
- [ ] Press "Stop Tracking". Tracking stops.
- [ ] Press the locate button to send a single location update.

## F6 — Meeting Points

- [ ] As guide, go to Manage tab with a tour selected.
- [ ] Fill in meeting point name, latitude, longitude. Check "Set as current".
- [ ] Press "Add Meeting Point". Meeting point appears in the list below with "Current" badge.
- [ ] Alternatively, press the locate icon to open the mini-map picker. Tap on map to auto-fill coordinates.
- [ ] Open Map tab. Blue pin appears at the meeting point location.
- [ ] Delete the meeting point from Manage tab. Confirm it disappears.

## F7 — Points of Interest (POI)

- [ ] As guide, go to Manage tab.
- [ ] Add a POI with title, description, lat, lng.
- [ ] POI appears in list. Open Map tab — purple pin appears.
- [ ] Delete the POI. Confirm it disappears from map.

## F10 — Tourist Joins Tour by Code

- [ ] As tourist, press "Join Tour" on Home.
- [ ] Enter the join code from the guide's tour. Press "Join".
- [ ] Tour appears in tourist's "My Tours" list.
- [ ] Tour summary card shows meeting point name and POI count.

## F11 — Tourist Views Tour Info

- [ ] As tourist, select the joined tour.
- [ ] Verify tour name, status, meeting point info are visible.

## F12 — Tourist Tracks Guide Location

- [ ] Guide starts tracking on their device/session.
- [ ] Tourist opens Map tab for the same tour.
- [ ] Guide marker appears on tourist's map (green = live, amber = stale).
- [ ] Guide location coordinates shown in bottom panel.

## F13 — Tourist Sees Meeting Point

- [ ] Guide sets a meeting point.
- [ ] Tourist's Map tab shows blue pin at the meeting point.
- [ ] Bottom panel shows meeting point name and time.

## Self-Location Marker

- [ ] Open Map tab (as either role). "You are here" blue dot appears at device location.
- [ ] Move the emulator's simulated location. Blue dot updates.

## Stale Guide Location Indicator

- [ ] Guide starts tracking, then stops.
- [ ] After 10 seconds, tourist's map shows amber warning badge with seconds count.
- [ ] Guide marker changes to amber color.

## Tour Switch Cleanup

- [ ] Tourist subscribes to Tour A (sees guide location).
- [ ] Tourist selects Tour B from Home.
- [ ] Guide marker from Tour A disappears. No cross-tour confusion.

## Last-Known Location Persistence

- [ ] Guide sends location for a tour.
- [ ] Restart the location service (`Ctrl+C`, then `npm run start:location`).
- [ ] Tourist opens map for same tour. Last-known location appears (fallback from DB).

## Settings Screen

- [ ] Navigate to Settings tab. Gateway and WS URLs are shown.
- [ ] Modify URLs. Verify they persist during the session.
- [ ] "About" section shows app version and service ports.

## F16 — Multiple Concurrent Tours

- [ ] Create two tours with different guides (or same guide).
- [ ] Both can be active simultaneously. Tourists can join each independently.

## F17 — Role-Based Access

- [ ] Tourist cannot see "Manage" tab.
- [ ] Tourist cannot create tours (no "Create Tour" button).
- [ ] Guide cannot see "Join Tour" on Home.

---

## Screenshot Evidence Checklist

- [ ] Auth screen (login + register views)
- [ ] Home screen with tour list and status badges
- [ ] Map screen with guide marker, meeting point, POI, and self-location
- [ ] Map screen showing stale indicator
- [ ] Manage screen with meeting points and POIs
- [ ] Manage screen with map coordinate picker
- [ ] Settings screen
- [ ] Tourist view: joined tour with guide tracking visible
