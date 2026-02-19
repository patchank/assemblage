import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

function getAdminConfig() {
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase admin environment variables.");
  }

  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey
  };
}

export function getAdminDb() {
  if (!app) {
    const credential = cert(getAdminConfig());
    app = getApps().length === 0 ? initializeApp({ credential }) : getApps()[0]!;
  }
  if (!db) {
    db = getFirestore(app);
  }
  return db;
}

