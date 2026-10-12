import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "hagar-intl";

/**
 * In development every value can stay fake: the Auth emulator accepts any
 * API key. For production, copy the real values into `.env` or set them in
 * your CI. See `.env.example`.
 */
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "fake-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  // The project's default bucket, which is also where the backend deletes
  // replaced photos.
  storageBucket: `${projectId}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
