import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAkzT-RrDwkepz6PK8QObNev0JF2U_R7Is",
  authDomain: "kampos-xestion.firebaseapp.com",
  projectId: "kampos-xestion",
  storageBucket: "kampos-xestion.firebasestorage.app",
  messagingSenderId: "768938342942",
  appId: "1:768938342942:web:e725429c66816fe2984c0f",
  // Añadir URL de la Realtime Database (necesario configurar en la consola de Firebase)
  databaseURL: "https://kampos-xestion-default-rtdb.europe-west1.firebasedatabase.app"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getDatabase(app);
export const auth = getAuth(app);

export default app;
