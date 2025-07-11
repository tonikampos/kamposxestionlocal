import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAkzT-RrDwkepz6PK8QObNev0JF2U_R7Is",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kampos-xestion.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kampos-xestion",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kampos-xestion.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "768938342942",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:768938342942:web:e725429c66816fe2984c0f",
  // URL de la Realtime Database
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://kampos-xestion-default-rtdb.europe-west1.firebasedatabase.app"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getDatabase(app);
export const auth = getAuth(app);

export default app;
