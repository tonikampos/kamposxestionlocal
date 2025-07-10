import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Profesor } from '../../utils/storageManager'
import { storageManager } from '../../utils/storageManager'

const ProfesoresForm = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  // Estado inicial del formulario
  const [formData, setFormData] = useState<Profesor>({
    id: '',
    nome: '',
    apelidos: '',
    email: '',
    telefono: '',
    contrasinal: '',
    activo: true
  })

  // Cargar datos si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      const profesor = storageManager.getProfesorById(id)
      if (profesor) {
        setFormData(profesor)
      } else {
        // Si no se encuentra el profesor, redirigir a la lista
        navigate('/profesores')
      }
    }
  }, [id, isEditing, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.nome.trim() || !formData.apelidos.trim() || !formData.email.trim() || !formData.contrasinal) {
      alert('Por favor, complete todos os campos obrigatorios: Nome, Apelidos, Email e Contrasinal.')
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert('Por favor, introduza un email válido.')
      return
    }

    // Validar que la contraseña tenga al menos 6 caracteres
    if (formData.contrasinal.length < 6) {
      alert('O contrasinal debe ter polo menos 6 caracteres.')
      return
    }

    try {
      if (isEditing) {
        // Actualizar profesor existente
        storageManager.updateProfesor(formData)
        alert('Profesor actualizado correctamente.')
        navigate('/profesores')
      } else {
        // Agregar nuevo profesor
        storageManager.addProfesor(formData)
        alert('Profesor rexistrado correctamente. Agora podes iniciar sesión.')
        // Redirigir a la página de login
        navigate('/login')
      }
    } catch (error) {
      console.error('Error ao gardar profesor:', error)
      alert('Ocorreu un erro ao gardar os datos do profesor.')
    }
  }

  return (
    <div className="px-2">
      <h1 className="text-xl md:text-2xl font-bold text-blue-800 mb-4 md:mb-6">
        {isEditing ? 'Editar Profesor' : 'Novo Profesor'}
      </h1>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Apelidos */}
            <div>
              <label htmlFor="apelidos" className="block text-sm font-medium text-gray-700 mb-1">
                Apelidos *
              </label>
              <input
                type="text"
                id="apelidos"
                name="apelidos"
                value={formData.apelidos}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Contrasinal */}
            <div>
              <label htmlFor="contrasinal" className="block text-sm font-medium text-gray-700 mb-1">
                Contrasinal *
              </label>
              <input
                type="password"
                id="contrasinal"
                name="contrasinal"
                value={formData.contrasinal}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Confirmación de contrasinal */}
            <div>
              <label htmlFor="confirmarContrasinal" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contrasinal *
              </label>
              <input
                type="password"
                id="confirmarContrasinal"
                name="confirmarContrasinal"
                onChange={(e) => {
                  // Solo lo usamos para validación, no se guarda
                  if (e.target.value !== formData.contrasinal) {
                    e.target.setCustomValidity('Os contrasinais non coinciden');
                  } else {
                    e.target.setCustomValidity('');
                  }
                }}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Activo */}
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                id="activo"
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                Profesor activo
              </label>
            </div>
          </div>

          <div className="mt-8 flex space-x-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isEditing ? 'Actualizar' : 'Gardar'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profesores')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfesoresForm
