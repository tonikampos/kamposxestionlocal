// Archivo para verificar que las variables de entorno se cargan correctamente

export function checkEnvVariables() {
  console.log("=== Verificación de Variables de Entorno ===");
  console.log("VITE_FIREBASE_API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_AUTH_DOMAIN:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_PROJECT_ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_STORAGE_BUCKET:", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_MESSAGING_SENDER_ID:", import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_APP_ID:", import.meta.env.VITE_FIREBASE_APP_ID ? "✅ Definida" : "❌ No definida");
  console.log("VITE_FIREBASE_DATABASE_URL:", import.meta.env.VITE_FIREBASE_DATABASE_URL ? "✅ Definida" : "❌ No definida");
  console.log("=======================================");
}
