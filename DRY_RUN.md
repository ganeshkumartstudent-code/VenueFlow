# 🧪 VenueFlow AI: Project Dry Run & Manual Steps
**Goal**: Identify every step required to go from "Repo Clone" to "Production Ready."

---

## 🛠️ Phase 1: Infrastructure (Manual)
The following steps **cannot** be automated and must be performed in the Google/Firebase Consoles.

### 1. Firebase Project Setup
- [ ] **Create Project**: Go to [Firebase Console](https://console.firebase.google.com/) and create "VenueFlow-AI".
- [ ] **Auth**: Enable **Google Sign-In** in the *Authentication* tab.
- [ ] **Firestore**: 
    - Enable Firestore in **Native Mode**.
    - Choose a location (e.g., `us-central1`).
- [ ] **Storage/Functions**: Enable the Blaze (Pay-as-you-go) plan. *Note: Most hackathons provide free credits or remain in free tier limits.*

### 2. Google Cloud Console (APIs)
- [ ] **Enable Maps JS API**: Enable in the [GCP Console](https://console.cloud.google.com/).
- [ ] **Enable Directions/Geocoding**: Required for the navigation features.
- [ ] **Enable BigQuery**: Ensure the BigQuery API is active.

---

## 🔐 Phase 2: Security & Keys (Manual)
### 1. AI Configuration
- [ ] **Google AI Studio**: Generate an API Key at [aistudio.google.com](https://aistudio.google.com/).
- [ ] **Functions Config**: Run this in your terminal:
  ```bash
  firebase functions:config:set gemini.key="PASTE_YOUR_KEY_HERE"
  ```

### 2. Frontend Config
- [ ] **Copy Config**: Go to Project Settings > General > Your Apps > Web App.
- [ ] **Apply to Project**: You have two options:
    1. Create `firebase-applet-config.json` in the root (legacy path in this project).
    2. Better: Create a `.env` file and update `src/lib/firebase.ts` to use it.

---

## 🚀 Phase 3: Automated Deployment
Once Phase 1 & 2 are done, run these in order:

```bash
# 1. Install all dependencies
npm install 
cd functions && npm install && cd ..

# 2. Deploy rules and functions
firebase deploy --only functions,firestore:rules

# 3. Start local development
npm run dev
```

---

## 📐 Phase 4: Data Initialization (Test Data)
The app starts with "Empty States." To see the UI in its full glory during a dry run:
1. **Sign In**: Log in via the browser.
2. **Assign Role**: Go to the Firestore Console and find your `users/{uid}` doc. Manually change `role` to `admin` or `staff`.
3. **Trigger AI**: In the Staff view, click **"Run AI Prediction"** to populate the `tasks` collection.

---

## ⚠️ Known Dependencies & Gotchas
1. **BigQuery Streaming**: The `firestore-bigquery-export` extension must be installed manually via the Firebase Extensions hub if you want true real-time streaming (optional for basic demo).
2. **AR Navigation**: Requires a mobile browser with camera permissions. Localhost may block this; use `ngrok` or Firebase Hosting for mobile testing.
3. **Maps Key Restriction**: Ensure your Google Maps API Key has "HTTP Referrer" restrictions set to `localhost:*` for development.
