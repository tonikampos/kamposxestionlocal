import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storageManager } from '../../utils/storageManager';
import type { Asignatura } from '../../utils/storageManager';

interface NotasAsignaturasSelectorProps {
  onAsignaturaSelected: (asignaturaId: string) => void;
  selectedAsignaturaId?: string | null;
}

const NotasAsignaturasSelector: React.FC<NotasAsignaturasSelectorProps> = ({ 
  onAsignaturaSelected, 
  selectedAsignaturaId 
}) => {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    cargarAsignaturas();
  }, [currentUser, navigate]);

  const cargarAsignaturas = () => {
    setLoading(true);
    try {
      if (currentUser) {
        const asignaturasFromStorage = storageManager.getAsignaturasByProfesor(currentUser.id);
        
        // Filtrar asignaturas que tienen configuración de evaluación
        const asignaturasConConfig = asignaturasFromStorage.filter(a => a.configuracionAvaliacion);
        
        setAsignaturas(asignaturasConConfig);
      } else {
        setAsignaturas([]);
      }
    } catch (error) {
      console.error('Error al cargar asignaturas:', error);
      alert('Erro ao cargar as asignaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const asignaturaId = e.target.value;
    if (asignaturaId) {
      onAsignaturaSelected(asignaturaId);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Cargando asignaturas...</div>;
  }

  if (asignaturas.length === 0) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
        <p className="text-amber-800">
          Non ten ningunha asignatura con configuración de avaliación. 
          Antes de poder xestionar notas, debe configurar a avaliación das súas asignaturas.
        </p>
        <a href="/asignaturas" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
          Ir a xestión de asignaturas
        </a>
      </div>
    );
  }

  return (
    <div>
      <select 
        className="w-full p-2 border border-gray-300 rounded"
        onChange={handleChange}
        value={selectedAsignaturaId || ''}
      >
        <option value="">Selecciona unha asignatura</option>
        {asignaturas.map(asignatura => (
          <option key={asignatura.id} value={asignatura.id}>
            {asignatura.nome} ({asignatura.nivel})
          </option>
        ))}
      </select>
    </div>
  );
};

export default NotasAsignaturasSelector;
