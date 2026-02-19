import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
  signInAnonymously
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBlouL3NBVX-zFigHEsXuKQkYrdHbyPGsU",
  authDomain: "assemblage-27d9b.firebaseapp.com",
  projectId: "assemblage-27d9b",
  appId: "1:206766086361:web:8b48c27adf0b3edebf86c8"
};

function getFirebaseConfig() {
  const {
    NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID
  } = process.env;

  return {
    apiKey: NEXT_PUBLIC_FIREBASE_API_KEY || FALLBACK_FIREBASE_CONFIG.apiKey,
    authDomain:
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || FALLBACK_FIREBASE_CONFIG.authDomain,
    projectId:
      NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_FIREBASE_CONFIG.projectId,
    appId: NEXT_PUBLIC_FIREBASE_APP_ID || FALLBACK_FIREBASE_CONFIG.appId
  };
}

export function getFirebaseClient() {
  if (!app) {
    const config = getFirebaseConfig();
    app = getApps().length === 0 ? initializeApp(config) : getApps()[0]!;
  }
  if (!auth) {
    auth = getAuth(app);
  }
  if (!db) {
    db = getFirestore(app);
  }

  return { app, auth, db };
}

/**
 * Optionally connect to local emulators in development.
 */
export function initFirebaseEmulators() {
  if (!app || !auth || !db) return;
  if (typeof window === "undefined") return;

  const useEmulators =
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";

  if (!useEmulators) return;

  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch {
    // ignored – already connected
  }
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch {
    // ignored – already connected
  }
}

export async function ensureAnonymousUser() {
  const { auth } = getFirebaseClient();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser!;
}

