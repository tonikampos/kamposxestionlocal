import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import AppFirebase from './AppFirebase'
import './style.css'

// Comprobar si localStorage está disponible
const isLocalStorageAvailable = () => {
  try {
    const testKey = 'test';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage no está disponible:', e);
    return false;
  }
};

// Mostrar advertencia si localStorage no está disponible
if (!isLocalStorageAvailable()) {
  console.warn('LocalStorage no está disponible. La aplicación puede no funcionar correctamente.');
  alert('Tu navegador no permite el almacenamiento local o está en modo privado. La aplicación puede no funcionar correctamente.');
}

// Usamos la versión de Firebase (Realtime Database) o la versión de localStorage
const USE_FIREBASE = true; // Cambiar a false para usar localStorage

// Función para renderizar la aplicación apropiada
const renderApp = () => {
  if (USE_FIREBASE) {
    console.log('Usando Firebase Realtime Database');
    return (
      <Router>
        <AppFirebase />
      </Router>
    );
  } else {
    console.log('Usando localStorage');
    return (
      <Router>
        <App />
      </Router>
    );
  }
};

// Eliminamos StrictMode para evitar problemas con el doble montaje en desarrollo
ReactDOM.createRoot(document.getElementById('root')!).render(
  renderApp()
)
