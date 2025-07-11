import { Link } from 'react-router-dom'
import { useRealtimeAuth } from '../firebase/RealtimeAuthContext'

const NavbarFirebase = () => {
  const { currentUser, logout, loading } = useRealtimeAuth();

  return (
    <nav className="bg-blue-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-xl md:text-2xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Kampos Xestión <span className="text-xs md:text-sm font-normal">(Firebase)</span>
          </Link>
        </div>
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
                  to="/" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 rounded-md text-xs md:text-sm whitespace-nowrap flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Inicio
                </Link>
                <Link 
                  to="/estadisticas" 
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-3 rounded-md text-xs md:text-sm whitespace-nowrap flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  ESTADISTICAS
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
