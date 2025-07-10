import { Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import ProfesoresForm from './pages/Profesores/ProfesoresForm'
import ProtectedRoute from './components/ProtectedRoute'
import AsignaturasPage from './pages/Asignaturas/AsignaturasPage'
import AlumnosPage from './pages/Alumnos/AlumnosPage'
import CopiasPage from './pages/Copias/CopiasPage'
import InformesPage from './pages/Informes/InformesPage'
import NotasPage from './pages/Notas/NotasPage'
import { useEffect } from 'react'

function AppContent() {
  // Verificar que localStorage funcione correctamente
  useEffect(() => {
    try {
      const testKey = 'test_storage';
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (testValue !== 'test') {
        console.warn('LocalStorage no funciona correctamente');
      } else {
        console.log('LocalStorage funciona correctamente');
      }
    } catch (error) {
      console.error('Error al acceder a localStorage:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/profesores/novo" element={<ProfesoresForm />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />            <Route path="/asignaturas/*" element={
              <ProtectedRoute>
                <AsignaturasPage />
              </ProtectedRoute>
            } />
          <Route path="/alumnos" element={
            <ProtectedRoute>
              <AlumnosPage />
            </ProtectedRoute>
          } />
          <Route path="/copias" element={
            <ProtectedRoute>
              <CopiasPage />
            </ProtectedRoute>
          } />
          <Route path="/informes" element={
            <ProtectedRoute>
              <InformesPage />
            </ProtectedRoute>
          } />
          <Route path="/notas" element={
            <ProtectedRoute>
              <NotasPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <footer className="bg-blue-800 text-white p-3 md:p-4 text-center text-xs md:text-base">
        <p>© {new Date().getFullYear()} Kampos Xestión - Aplicación para xestión de alumnos</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
