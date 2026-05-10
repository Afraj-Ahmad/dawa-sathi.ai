import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Prescription from './pages/Prescription';
import LabReport from './pages/LabReport';
import History from './pages/History';
import SharedAnalysisView from './pages/SharedAnalysisView';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="prescription" element={<Prescription />} />
              <Route path="lab-report" element={<LabReport />} />
              <Route path="history" element={<History />} />
            </Route>
            <Route path="/shared/:shareId" element={<SharedAnalysisView />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
