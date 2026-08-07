import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Patients from '@/pages/Patients';
import PatientDetail from '@/pages/PatientDetail';
import ReportDetail from '@/pages/ReportDetail';
import ProtectedRoute from '@/components/ProtectedRoute';
import MedicalNewsPage from '@/pages/MedicalNewsPage';
import Landing from '@/pages/Landing';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
      <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
      <Route path="/reports/:id/analysis" element={<ReportDetail />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/news" element={<MedicalNewsPage />} />
    </Routes>
  );
}

export default App;