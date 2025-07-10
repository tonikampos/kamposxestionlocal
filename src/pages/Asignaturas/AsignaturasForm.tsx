import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storageManager, NIVEL_EDUCATIVO } from '../../utils/storageManager';
import type { Asignatura, NivelEducativo } from '../../utils/storageManager';

const AsignaturasForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEditing = !!id;

  // Estado inicial del formulario
  const [formData, setFormData] = useState<Omit<Asignatura, 'id' | 'createdAt' | 'updatedAt'>>({
    profesorId: currentUser?.id || '',
    nome: '',
    nivel: NIVEL_EDUCATIVO.OUTROS,
    curso: 1, // Valor predeterminado para el campo curso
    sesionsSemanais: 1,
    numeroAvaliaciois: 3
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (isEditing && id && currentUser?.id) {
      setLoading(true);
      try {
        const asignatura = storageManager.getAsignaturaById(id);
        if (asignatura) {
          // Verificar que la asignatura pertenece al profesor actual
          if (asignatura.profesorId !== currentUser.id) {
            setError('Non ten permisos para editar esta asignatura');
            navigate('/asignaturas');
            return;
          }
          
          setFormData({
            profesorId: asignatura.profesorId,
            nome: asignatura.nome,
            nivel: asignatura.nivel,
            curso: asignatura.curso || 1, // Usar el valor existente o predeterminado
            sesionsSemanais: asignatura.sesionsSemanais,
            numeroAvaliaciois: asignatura.numeroAvaliaciois
          });
        } else {
          setError('Non se atopou a asignatura solicitada');
          navigate('/asignaturas');
        }
      } catch (err) {
        console.error('Error al cargar asignatura:', err);
        setError('Ocorreu un erro ao cargar a información da asignatura');
      } finally {
        setLoading(false);
      }
    }
  }, [id, isEditing, currentUser, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar datos
      if (!formData.nome.trim()) {
        setError('O nome da asignatura é obrigatorio');
        return;
      }

      if (!currentUser?.id) {
        setError('Debe iniciar sesión para rexistrar unha asignatura');
        return;
      }

      // Asegurarse de que el profesorId es correcto
      const asignaturaData: Omit<Asignatura, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        profesorId: currentUser.id
      };

      if (isEditing && id) {
        // Obtener la asignatura original para mantener ID y fechas
        const originalAsignatura = storageManager.getAsignaturaById(id);
        if (originalAsignatura) {
          const updatedAsignatura: Asignatura = {
            ...asignaturaData,
            id: originalAsignatura.id,
            createdAt: originalAsignatura.createdAt,
            updatedAt: new Date().toISOString()
          };
          storageManager.updateAsignatura(updatedAsignatura);
          alert('Asignatura actualizada con éxito');
        }
      } else {
        // Crear nueva asignatura
        const newAsignatura: Asignatura = {
          ...asignaturaData,
          id: '', // Se generará en addAsignatura
          createdAt: '', // Se generará en addAsignatura
          updatedAt: '' // Se generará en addAsignatura
        };
        storageManager.addAsignatura(newAsignatura);
        alert('Asignatura rexistrada con éxito');
      }
      
      // Redirigir a la lista de asignaturas
      navigate('/asignaturas');
      
    } catch (err) {
      console.error('Error al guardar asignatura:', err);
      setError('Ocorreu un erro ao gardar a asignatura');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div className="text-center py-8">Cargando información da asignatura...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        {isEditing ? 'Editar Asignatura' : 'Nova Asignatura'}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome da asignatura */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da asignatura *
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

            {/* Nivel educativo */}
            <div>
              <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
                Nivel educativo *
              </label>
              <select
                id="nivel"
                name="nivel"
                value={formData.nivel}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(NIVEL_EDUCATIVO).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Curso */}
            <div>
              <label htmlFor="curso" className="block text-sm font-medium text-gray-700 mb-1">
                Curso *
              </label>
              <input
                type="number"
                id="curso"
                name="curso"
                min="1"
                max="6"
                value={formData.curso}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sesións semanais */}
            <div>
              <label htmlFor="sesionsSemanais" className="block text-sm font-medium text-gray-700 mb-1">
                Sesións semanais *
              </label>
              <input
                type="number"
                id="sesionsSemanais"
                name="sesionsSemanais"
                min="1"
                max="20"
                value={formData.sesionsSemanais}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Número de avaliacións */}
            <div>
              <label htmlFor="numeroAvaliaciois" className="block text-sm font-medium text-gray-700 mb-1">
                Número de avaliacións *
              </label>
              <input
                type="number"
                id="numeroAvaliaciois"
                name="numeroAvaliaciois"
                min="1"
                max="10"
                value={formData.numeroAvaliaciois}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-8 flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
            >
              {loading 
                ? (isEditing ? 'Actualizando...' : 'Gardando...') 
                : (isEditing ? 'Actualizar asignatura' : 'Gardar asignatura')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/asignaturas')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AsignaturasForm;
