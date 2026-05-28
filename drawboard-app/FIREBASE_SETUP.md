# Firebase Auth + Firestore Boards Setup

This app uses:
- Firebase Authentication (Google sign-in only)
- Firestore for personal cloud boards
- Firebase Storage for board files (images embedded in boards)

## 1. Configure Firebase (auth + Firestore + Storage)

In Firebase console:
1. Create a project (or reuse one).
2. Add a **Web app** and copy the config object (`apiKey`, `authDomain`, etc).
3. Authentication -> Sign-in method -> enable **Google**.
4. Add authorized domains:
   - `localhost`
   - your production domain
5. Storage -> Get started (use production rules if you want per-user isolation).

## 2. Configure app env vars

Create `/.env.development.local` in repo root:

```bash
VITE_APP_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
```

For production builds, set the same env vars in deployment settings.

## 3. Verify end-to-end

1. Run app (`bun start`).
2. Open top-left menu -> **Sign in** (Firebase Google).
3. Open **My Boards**, save a board.
4. Edit canvas and wait ~1-2s (autosave debounce).
5. Reload page and load the board again.

## Troubleshooting

- Sign-in popup fails:
  - Enable Google provider in Firebase Auth.
  - Add current domain to Firebase authorized domains.
  - Allow popups in browser.
- Boards fail to load/save:
  - Confirm Firestore is enabled in your Firebase project.
  - Confirm your domain is added in Firebase Auth authorized domains.
- Images fail to load/save:
  - Confirm Firebase Storage is enabled and storageBucket is in config.
