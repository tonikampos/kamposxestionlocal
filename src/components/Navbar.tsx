import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();

  return (
    <nav className="bg-blue-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-bold">
          Kampos Xestión
        </Link>
        <div className="flex items-center mt-0">
          {isAuthenticated ? (
            <div className="flex flex-wrap items-center justify-end">
              <span className="mr-2 text-blue-100 font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-none">
                {currentUser?.nome} {currentUser?.apelidos}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-3 rounded-md text-xs md:text-sm whitespace-nowrap"
              >
                Pechar Sesión
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200 text-sm md:text-base mr-2 md:mr-4">
                Iniciar Sesión
              </Link>
              <Link to="/profesores/novo" className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm whitespace-nowrap">
                Rexistrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
