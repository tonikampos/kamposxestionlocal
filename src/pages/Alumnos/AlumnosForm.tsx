import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storageManager } from '../../utils/storageManager';
import type { Alumno } from '../../utils/storageManager';

interface AlumnosFormProps {
  alumno?: Alumno; // Optional for edit mode
  onSave: () => void;
  onCancel: () => void;
}

const AlumnosForm: React.FC<AlumnosFormProps> = ({ alumno, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const isEditMode = !!alumno;

  const [formData, setFormData] = useState({
    nome: alumno?.nome || '',
    apelidos: alumno?.apelidos || '',
    email: alumno?.email || '',
    telefono: alumno?.telefono || '',
  });

  const [errors, setErrors] = useState({
    nome: '',
    apelidos: '',
    email: '',
  });

  const validateForm = (): boolean => {
    const newErrors = {
      nome: formData.nome.trim() ? '' : 'O nome é obrigatorio',
      apelidos: formData.apelidos.trim() ? '' : 'Os apelidos son obrigatorios',
      email: formData.email.trim() 
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) 
          ? '' 
          : 'O email non é válido'
        : 'O email é obrigatorio',
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !currentUser) {
      return;
    }

    try {
      if (isEditMode && alumno) {
        storageManager.updateAlumno({
          ...alumno,
          ...formData,
        });
      } else {
        storageManager.addAlumno({
          id: '', // Will be set by storage manager
          profesorId: currentUser.id,
          nome: formData.nome.trim(),
          apelidos: formData.apelidos.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim() || undefined,
          createdAt: '', // Will be set by storage manager
          updatedAt: '', // Will be set by storage manager
        });
      }
      onSave();
    } catch (error) {
      console.error('Error ao gardar o alumno:', error);
      alert('Ocorreu un erro ao gardar o alumno. Por favor, inténteo de novo.');
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onCancel}
          className="mr-3 text-gray-600 hover:text-gray-900 p-1"
          aria-label="Volver"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {isEditMode ? 'Editar Alumno' : 'Novo Alumno'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nome" className="block text-gray-700 font-medium mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            className={`w-full p-2 border rounded-md ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
        </div>

        <div>
          <label htmlFor="apelidos" className="block text-gray-700 font-medium mb-1">
            Apelidos <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="apelidos"
            name="apelidos"
            value={formData.apelidos}
            onChange={handleInputChange}
            className={`w-full p-2 border rounded-md ${errors.apelidos ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.apelidos && <p className="text-red-500 text-sm mt-1">{errors.apelidos}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full p-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            autoCapitalize="off"
            autoComplete="email"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="telefono" className="block text-gray-700 font-medium mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end mt-6 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full sm:w-auto"
          >
            {isEditMode ? 'Actualizar' : 'Gardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlumnosForm;
