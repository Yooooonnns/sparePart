import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ScanPage } from './pages/ScanPage';
import { ValidatePage } from './pages/ValidatePage';
import { ManagementPage } from './pages/ManagementPage';
import { AdminPage } from './pages/AdminPage';

function ScanRedirect() {
  const { qrCode } = useParams<{ qrCode: string }>();
  return <Navigate to={`/validate/${qrCode}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScanPage />} />
      <Route path="/validate/:qrCode" element={<ValidatePage />} />
      <Route path="/scan/:qrCode" element={<ScanRedirect />} />
      <Route path="/management" element={<ManagementPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
