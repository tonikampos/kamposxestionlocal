import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Profesor } from '../../utils/storageManager'
import { storageManager } from '../../utils/storageManager'

const ProfesoresList = () => {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    // Cargar profesores al montar el componente
    loadProfesores()
  }, [])

  const loadProfesores = () => {
    const data = storageManager.getProfesores()
    setProfesores(data)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de que quere eliminar este profesor?')) {
      storageManager.deleteProfesor(id)
      // Recargar la lista después de eliminar
      loadProfesores()
    }
  }

  // Filtrar profesores según el texto de búsqueda
  const profesoresFiltrados = profesores.filter(profesor => 
    profesor.nome.toLowerCase().includes(filtro.toLowerCase()) || 
    profesor.apelidos.toLowerCase().includes(filtro.toLowerCase()) ||
    profesor.email.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Xestión de Profesores</h1>
        <Link 
          to="/profesores/novo" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Novo Profesor
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, apelidos ou email..."
          className="w-full p-2 border border-gray-300 rounded-lg"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {profesoresFiltrados.length === 0 ? (
        <div className="bg-white p-4 rounded-lg shadow text-center">
          {filtro ? (
            <p>Non se atoparon profesores que coincidan co filtro.</p>
          ) : (
            <p>Non hai profesores rexistrados. Engade un novo profesor para comezar.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Nome</th>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Teléfono</th>
                <th className="py-3 px-4 text-left">Estado</th>
                <th className="py-3 px-4 text-center">Accións</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profesoresFiltrados.map((profesor) => (
                <tr key={profesor.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {profesor.nome} {profesor.apelidos}
                  </td>
                  <td className="py-3 px-4">{profesor.email}</td>
                  <td className="py-3 px-4">{profesor.telefono}</td>
                  <td className="py-3 px-4">
                    {profesor.activo ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center space-x-2">
                      <Link 
                        to={`/profesores/editar/${profesor.id}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </Link>
                      <button 
                        onClick={() => handleDelete(profesor.id)} 
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProfesoresList
