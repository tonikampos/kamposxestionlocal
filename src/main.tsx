import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import AppFirebase from './AppFirebase'
import './style.css'

// La aplicación ahora usa exclusivamente Firebase Realtime Database
console.log('Inicializando aplicación con Firebase Realtime Database');

// Función para renderizar la aplicación
const renderApp = () => {
  return (
    <Router>
      <AppFirebase />
    </Router>
  );
};

// Eliminamos StrictMode para evitar problemas con el doble montaje en desarrollo
ReactDOM.createRoot(document.getElementById('root')!).render(
  renderApp()
)
