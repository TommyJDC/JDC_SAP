import React from 'react';
import {  Route, Routes } from 'react-router-dom';
import Navbar from './components/UI/Navbar';
import DashboardPage from './pages/Dashboard/DashboardPage';
import SAPPage from './pages/SAP/SAPPage';
import EnvoisPage from './pages/Envois/EnvoisPage';
import AdminPage from './pages/Admin/AdminPage';
import AuthPage from './pages/Auth/AuthPage';

function App() {
  return (
    <div className="container mx-auto px-4 mt-8">
      <Navbar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sap" element={<SAPPage />} />
        <Route path="/envois" element={<EnvoisPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </div>
  );
}

export default App;
