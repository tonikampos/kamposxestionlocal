import { Link } from 'react-router-dom'
import { useRealtimeAuth } from '../firebase/RealtimeAuthContext'

const NavbarFirebase = () => {
  const { currentUser, logout, loading } = useRealtimeAuth();

  return (
    <nav className="bg-blue-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-bold">
          Kampos Xestión <span className="text-xs md:text-sm font-normal">(Firebase)</span>
        </Link>
        <div className="flex items-center mt-0">
          {loading ? (
            <span className="text-blue-200 text-sm">Cargando...</span>
          ) : currentUser ? (
            <div className="flex flex-wrap items-center justify-end">
              <span className="mr-2 text-blue-100 font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-none">
                {currentUser?.nome} {currentUser?.apelidos}
              </span>
              <div className="flex items-center space-x-2">
                <Link 
                  to="/migracion" 
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-3 rounded-md text-xs md:text-sm whitespace-nowrap"
                >
                  Migrar Datos
                </Link>
                <button
                  onClick={() => logout()}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-3 rounded-md text-xs md:text-sm whitespace-nowrap"
                >
                  Pechar Sesión
                </button>
              </div>
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

export default NavbarFirebase
