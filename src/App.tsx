import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/UI/Navbar';
import DashboardPage from './pages/Dashboard/DashboardPage';
import SAPPage from './pages/SAP/SAPPage';
import EnvoisPage from './pages/Envois/EnvoisPage';
import AdminPage from './pages/Admin/AdminPage';
import AuthPage from './pages/Auth/AuthPage';

function App() {
  return (
    // Removed container from here, Navbar and page content will manage their own padding
    <>
      <Navbar />
      <main className="container mx-auto px-4 fade-in"> {/* Add fade-in animation */}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sap" element={<SAPPage />} />
          <Route path="/envois" element={<EnvoisPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
