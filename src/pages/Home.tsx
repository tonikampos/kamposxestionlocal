import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="text-center px-2">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4 md:mb-8">Benvido a Kampos Xestión</h1>
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-8 max-w-4xl mx-auto">
        
        {/* Menú de navegación central */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 my-6 md:my-12">
          <Link 
            to="/asignaturas" 
            className="flex flex-col items-center justify-center p-3 md:p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg transform hover:scale-105"
          >
            <span className="text-2xl md:text-4xl mb-2 md:mb-3">📚</span>
            <span className="text-sm md:text-xl font-medium">Asignaturas</span>
          </Link>
          
          <Link 
            to="/alumnos" 
            className="flex flex-col items-center justify-center p-3 md:p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg transform hover:scale-105"
          >
            <span className="text-2xl md:text-4xl mb-2 md:mb-3">👥</span>
            <span className="text-sm md:text-xl font-medium">Alumnos</span>
          </Link>
          
          <Link 
            to="/notas" 
            className="flex flex-col items-center justify-center p-3 md:p-6 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-all hover:shadow-lg transform hover:scale-105"
          >
            <span className="text-2xl md:text-4xl mb-2 md:mb-3">🏆</span>
            <span className="text-sm md:text-xl font-bold">NOTAS</span>
          </Link>
          
          <Link 
            to="/informes" 
            className="flex flex-col items-center justify-center p-3 md:p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg transform hover:scale-105"
          >
            <span className="text-2xl md:text-4xl mb-2 md:mb-3">📊</span>
            <span className="text-sm md:text-xl font-medium">Informes</span>
          </Link>
          
          <Link 
            to="/copias" 
            className="flex flex-col items-center justify-center p-3 md:p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg transform hover:scale-105"
          >
            <span className="text-2xl md:text-4xl mb-2 md:mb-3">💾</span>
            <span className="text-sm md:text-xl font-medium">Copias</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
