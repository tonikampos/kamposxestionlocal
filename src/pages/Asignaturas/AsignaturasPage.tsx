import { Routes, Route, Navigate } from 'react-router-dom';
import AsignaturasList from './AsignaturasList';
import AsignaturasForm from './AsignaturasForm';
import ConfiguracionAvaliacion from './ConfiguracionAvaliacion';
import MatriculasAsignatura from './MatriculasAsignatura';

const AsignaturasPage = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Xestión de Asignaturas</h1>
      
      <Routes>
        <Route path="/" element={<AsignaturasList />} />
        <Route path="/nova" element={<AsignaturasForm />} />
        <Route path="/editar/:id" element={<AsignaturasForm />} />
        <Route path="/configurar/:id" element={<ConfiguracionAvaliacion />} />
        <Route path="/matriculas/:id" element={<MatriculasAsignatura />} />
        <Route path="*" element={<Navigate to="/asignaturas" />} />
      </Routes>
    </div>
  );
};

export default AsignaturasPage;
