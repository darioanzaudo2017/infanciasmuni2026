import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/shared/MainLayout';
import Dashboard from './features/Dashboard';
import ExpedientesList from './features/expedientes/ExpedientesList';
import LoginPage from './features/auth/LoginPage';
import RecoveryPage from './features/auth/RecoveryPage';
import UserManagementPage from './features/admin/users/UserManagementPage';
import IngresosPage from './features/expedientes/ingresos/IngresosPage';
import IngresoDetail from './features/expedientes/ingresos/IngresoDetail';
import NuevaRecepcion from './features/expedientes/NuevaRecepcion';
import FormularioRecepcion from './features/expedientes/recepcion/FormularioRecepcion';
import AmpliacionContainer from './features/expedientes/ampliacion/AmpliacionContainer';
import InformeSintesis from './features/expedientes/sintesis/InformeSintesis';
import DefinicionMedidas from './features/expedientes/definicion/DefinicionMedidas';
import PlanAccionMedida from './features/expedientes/definicion/PlanAccionMedida';
import ActaCompromiso from './features/expedientes/definicion/ActaCompromiso';
import CierreIngreso from './features/expedientes/cese/CierreIngreso';
import SolicitudSenafForm from './features/expedientes/senaf/SolicitudSenafForm';
import SolicitudSenafSummary from './features/expedientes/senaf/SolicitudSenafSummary';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-password" element={<RecoveryPage />} />

        {/* App Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="expedientes" element={<ExpedientesList />} />
          <Route path="expedientes/nuevo" element={<NuevaRecepcion />} />
          <Route path="expedientes/recepcion/nuevo" element={<FormularioRecepcion key="new" />} />
          <Route path="expedientes/:expedienteId/recepcion/:ingresoId" element={<FormularioRecepcion key="edit" />} />
          <Route path="expedientes/:expedienteId/ampliacion/:ingresoId" element={<AmpliacionContainer />} />
          <Route path="expedientes/:expedienteId/sintesis/:ingresoId" element={<InformeSintesis />} />
          <Route path="expedientes/:id/ingresos" element={<IngresosPage />} />
          <Route path="expedientes/:expedienteId/ingresos/:ingresoId" element={<IngresoDetail />} />
          <Route path="usuarios" element={<UserManagementPage />} />
          <Route path="expedientes/:expedienteId/definicion/:ingresoId" element={<DefinicionMedidas />} />
          <Route path="expedientes/:expedienteId/definicion/:ingresoId/medida/:medidaId" element={<PlanAccionMedida />} />
          <Route path="medidas" element={<div>Medidas</div>} />
          <Route path="senaf" element={<div>SENAF</div>} />
          <Route path="expedientes/:expedienteId/senaf/:ingresoId" element={<SolicitudSenafForm />} />
          <Route path="expedientes/:expedienteId/senaf/:ingresoId/resumen" element={<SolicitudSenafSummary />} />
          <Route path="reportes" element={<div>Reportes</div>} />
          <Route path="configuracion" element={<div>Configuración</div>} />
        </Route>

        {/* Standalone Route for Acta */}
        <Route path="expedientes/:expedienteId/acta/:ingresoId" element={<ActaCompromiso />} />
        <Route path="expedientes/:expedienteId/cierre/:ingresoId" element={<CierreIngreso />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
