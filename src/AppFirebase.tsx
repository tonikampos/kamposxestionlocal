import { Routes, Route } from 'react-router-dom';
import { RealtimeAuthProvider } from './firebase/RealtimeAuthContext';
import NavbarFirebase from './components/NavbarFirebase';
import Home from './pages/Home';
import LoginFirebase from './pages/LoginFirebase';
import ProfesoresFormFirebase from './pages/Profesores/ProfesoresFormFirebase';
import ProtectedRouteFirebase from './components/ProtectedRouteFirebase';
import AsignaturasPage from './pages/Asignaturas/AsignaturasPage';
import AlumnosPage from './pages/Alumnos/AlumnosPage';
import CopiasPage from './pages/Copias/CopiasPage';
import InformesPage from './pages/Informes/InformesPage';
import NotasPage from './pages/Notas/NotasPage';
import MigracionPage from './pages/MigracionPage';
import EstadisticasPage from './pages/Estadisticas/EstadisticasPage';
import { useEffect } from 'react';

function AppContentFirebase() {
  // Verificar que Firebase está correctamente configurado
  useEffect(() => {
    console.log('Aplicación iniciada con Firebase Realtime Database');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarFirebase />
      <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <Routes>
          <Route path="/login" element={<LoginFirebase />} />
          <Route path="/profesores/novo" element={<ProfesoresFormFirebase />} />
          <Route path="/" element={
            <ProtectedRouteFirebase>
              <Home />
            </ProtectedRouteFirebase>
          } />
          <Route path="/asignaturas/*" element={
            <ProtectedRouteFirebase>
              <AsignaturasPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/alumnos" element={
            <ProtectedRouteFirebase>
              <AlumnosPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/copias" element={
            <ProtectedRouteFirebase>
              <CopiasPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/informes" element={
            <ProtectedRouteFirebase>
              <InformesPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/notas" element={
            <ProtectedRouteFirebase>
              <NotasPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/migracion" element={
            <ProtectedRouteFirebase>
              <MigracionPage />
            </ProtectedRouteFirebase>
          } />
          <Route path="/estadisticas" element={
            <ProtectedRouteFirebase>
              <EstadisticasPage />
            </ProtectedRouteFirebase>
          } />
        </Routes>
      </main>
      <footer className="bg-blue-800 text-white p-3 md:p-4 text-center text-xs md:text-base">
        <p>© {new Date().getFullYear()} Kampos Xestión - Aplicación para xestión de alumnos</p>
      </footer>
    </div>
  );
}

function AppFirebase() {
  return (
    <RealtimeAuthProvider>
      <AppContentFirebase />
    </RealtimeAuthProvider>
  );
}

export default AppFirebase;
