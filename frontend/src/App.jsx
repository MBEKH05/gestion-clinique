import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import SpaceLayout from './components/SpaceLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CategoriesManagement from './pages/CategoriesManagement';
import AnalysesList from './pages/AnalysesList';
import AnalysesForm from './pages/AnalysesForm';
import IPMList from './pages/IPMList';
import IPMForm from './pages/IPMForm';
import IPMTarifs from './pages/IPMTarifs';
import AssurancesList from './pages/AssurancesList';
import AssurancesForm from './pages/AssurancesForm';
import AssurancesTarifs from './pages/AssurancesTarifs';
import PatientsList from './pages/PatientsList';
import PatientsForm from './pages/PatientsForm';
import DevisList from './pages/DevisList';
import Historique from './pages/Historique';
import DevisForm from './pages/DevisForm';
import DevisDetail from './pages/DevisDetail';
import DevisProformaList from './pages/DevisProformaList';
import DevisProformaForm from './pages/DevisProformaForm';
import DevisMensuel from './pages/DevisMensuel';
import Statistiques from './pages/Statistiques';
import DetailPrestation from './pages/DetailPrestation';

import TechnicienDossiers from './pages/lab/TechnicienDossiers';
import MedecinDossiers from './pages/lab/MedecinDossiers';
import SecretaireDossiers from './pages/lab/SecretaireDossiers';
import ListeDossiers from './pages/lab/ListeDossiers';
import Hospitalisation from './pages/lab/Hospitalisation';
import AdminLabConsole from './pages/lab/AdminLabConsole';

import AdminDashboard from './pages/admin/AdminDashboard';
import UsersList from './pages/admin/UsersList';
import UserForm from './pages/admin/UserForm';
import AdminLabUsersList from './pages/admin/AdminLabUsersList';
import AdminLabUserForm from './pages/admin/AdminLabUserForm';
import AdminLabDossiersList from './pages/admin/AdminLabDossiersList';
import AdminLabDossierDetail from './pages/admin/AdminLabDossierDetail';

function ProtectedLayout() {
  return (
    <ProtectedRoute requireSpace="facturation">
      <DataProvider>
        <Layout />
      </DataProvider>
    </ProtectedRoute>
  );
}

function ProtectedLabLayout() {
  return (
    <ProtectedRoute requireSpace="laboratoire">
      <SpaceLayout space="laboratoire" />
    </ProtectedRoute>
  );
}

function ProtectedAdminLayout() {
  return (
    <ProtectedRoute requireSpace="administration">
      <SpaceLayout space="administration" />
    </ProtectedRoute>
  );
}

function labRoute(roles, element) {
  return (
    <ProtectedRoute requireSpace="laboratoire" allowedRoles={roles}>
      {element}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route
              path="/categories"
              element={
                <ProtectedRoute adminOnly>
                  <CategoriesManagement />
                </ProtectedRoute>
              }
            />

            <Route path="/base-de-donnees/:category" element={<AnalysesList />} />
            <Route path="/base-de-donnees/:category/ajouter" element={<AnalysesForm />} />
            <Route path="/base-de-donnees/:category/:id/modifier" element={<AnalysesForm />} />

            <Route path="/analyses" element={<Navigate to="/base-de-donnees/analyses" replace />} />
            <Route path="/analyses/ajouter" element={<Navigate to="/base-de-donnees/analyses/ajouter" replace />} />
            <Route path="/analyses/:id/modifier" element={<AnalysesForm />} />

            <Route path="/ipm" element={<IPMList />} />
            <Route path="/ipm/ajouter" element={<IPMForm />} />
            <Route path="/ipm/:id/modifier" element={<IPMForm />} />
            <Route path="/ipm/:id/tarifs" element={<IPMTarifs />} />

            <Route path="/assurances" element={<AssurancesList />} />
            <Route path="/assurances/ajouter" element={<AssurancesForm />} />
            <Route path="/assurances/:id/modifier" element={<AssurancesForm />} />
            <Route path="/assurances/:id/tarifs" element={<AssurancesTarifs />} />

            <Route path="/patients" element={<PatientsList />} />
            <Route path="/patients/ajouter" element={<PatientsForm />} />
            <Route path="/patients/:id/modifier" element={<PatientsForm />} />

            <Route path="/historique" element={<Historique />} />

            <Route path="/devis" element={<DevisList />} />
            <Route path="/devis/creer" element={<DevisForm />} />
            <Route path="/devis/mensuel" element={<DevisMensuel />} />
            <Route path="/devis/proforma" element={<DevisProformaList />} />
            <Route path="/devis/proforma/creer" element={<DevisProformaForm />} />
            <Route path="/devis/proforma/:id/modifier" element={<DevisProformaForm />} />
            <Route path="/devis/:id" element={<DevisDetail />} />
            <Route path="/devis/:id/modifier" element={<DevisForm />} />

            <Route
              path="/statistiques"
              element={
                <ProtectedRoute adminOnly>
                  <Statistiques />
                </ProtectedRoute>
              }
            />
            <Route
              path="/detail-prestation"
              element={
                <ProtectedRoute adminOnly>
                  <DetailPrestation />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route element={<ProtectedLabLayout />}>
            <Route path="/lab/technicien" element={labRoute(['technicien'], <TechnicienDossiers />)} />
            <Route path="/lab/medecin" element={labRoute(['medecin'], <MedecinDossiers />)} />
            <Route path="/lab/secretaire" element={labRoute(['secretaire'], <SecretaireDossiers />)} />
            <Route
              path="/lab/liste-dossiers"
              element={labRoute(['technicien', 'medecin', 'secretaire'], <ListeDossiers />)}
            />
            <Route path="/lab/hospitalisation" element={labRoute(['technicien'], <Hospitalisation />)} />
            <Route path="/lab/admin" element={labRoute(['administrateur'], <AdminLabConsole />)} />

            <Route path="/lab/*" element={<Navigate to="/lab/admin" replace />} />
          </Route>

          <Route element={<ProtectedAdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="/admin/comptes-facturation" element={<UsersList />} />
            <Route path="/admin/comptes-facturation/ajouter" element={<UserForm />} />
            <Route path="/admin/comptes-facturation/:id/modifier" element={<UserForm />} />

            <Route path="/admin/comptes-labo" element={<AdminLabUsersList />} />
            <Route path="/admin/comptes-labo/ajouter" element={<AdminLabUserForm />} />
            <Route path="/admin/comptes-labo/:id/modifier" element={<AdminLabUserForm />} />

            <Route path="/admin/dossiers-labo" element={<AdminLabDossiersList />} />
            <Route path="/admin/dossiers-labo/:id" element={<AdminLabDossierDetail />} />

            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
