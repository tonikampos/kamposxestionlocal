import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [contrasinal, setContrasinal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Ya no necesitamos verificar el número de profesores
  useEffect(() => {
    // Inicialización si fuera necesaria
  }, []);

  // Si ya está autenticado, redirigir a la página de inicio
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Intentando login con:', email);
      const success = await login(email, contrasinal);
      if (success) {
        navigate('/');
      } else {
        setError('Email ou contrasinal incorrectos');
      }
    } catch (err) {
      setError('Erro ao intentar iniciar sesión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">
          Iniciar Sesión
        </h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="contrasinal" className="block text-sm font-medium text-gray-700 mb-1">
              Contrasinal
            </label>
            <input
              id="contrasinal"
              type="password"
              value={contrasinal}
              onChange={(e) => setContrasinal(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors disabled:bg-blue-300"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-sm text-gray-600 text-center">
            ¿Non tes unha conta de profesor?{' '}
            <Link 
              to="/profesores/novo" 
              className="text-blue-600 hover:text-blue-800"
            >
              Rexístrate como profesor
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2 text-center">
            *Esta aplicación só está dispoñible para profesores previamente rexistrados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
