import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRealtimeAuth } from '../../firebase/RealtimeAuthContext'
import type { Profesor } from '../../utils/storageManager'

const ProfesoresFormFirebase = () => {
  const navigate = useNavigate()
  const { register } = useRealtimeAuth()

  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    nome: '',
    apelidos: '',
    email: '',
    telefono: '',
    contrasinal: '',
    contrasinalConfirm: '' // Para confirmar contraseña
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    // Validaciones básicas
    if (!formData.nome.trim() || !formData.apelidos.trim() || !formData.email.trim() || !formData.contrasinal) {
      setError('Por favor, complete todos os campos obrigatorios: Nome, Apelidos, Email e Contrasinal.');
      return
    }

    // Validar que las contraseñas coinciden
    if (formData.contrasinal !== formData.contrasinalConfirm) {
      setError('As contrasinals non coinciden');
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, ingrese un email válido');
      return
    }

    // Validar contraseña segura (mínimo 6 caracteres)
    if (formData.contrasinal.length < 6) {
      setError('A contrasinal debe ter polo menos 6 caracteres');
      return
    }
    
    try {
      setLoading(true)
      
      // Registrar profesor en Firebase
      await register({
        nome: formData.nome,
        apelidos: formData.apelidos,
        email: formData.email,
        telefono: formData.telefono,
        contrasinal: formData.contrasinal
      });
      
      alert('Profesor rexistrado con éxito! Agora pode iniciar sesión');
      navigate('/login');
    } catch (err: any) {
      console.error('Error al registrar profesor:', err);
      
      // Manejar errores específicos de Firebase
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está en uso');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo electrónico no es válido');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil');
      } else {
        setError(`Erro ao rexistrar: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Rexistrar Novo Profesor
      </h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border-l-4 border-red-500">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome *</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="apelidos" className="block text-sm font-medium text-gray-700">Apelidos *</label>
            <input
              type="text"
              id="apelidos"
              name="apelidos"
              value={formData.apelidos}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contrasinal" className="block text-sm font-medium text-gray-700">Contrasinal *</label>
            <input
              type="password"
              id="contrasinal"
              name="contrasinal"
              value={formData.contrasinal}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="contrasinalConfirm" className="block text-sm font-medium text-gray-700">Confirmar Contrasinal *</label>
            <input
              type="password"
              id="contrasinalConfirm"
              name="contrasinalConfirm"
              value={formData.contrasinalConfirm}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? 'Rexistrando...' : 'Rexistrar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfesoresFormFirebase
