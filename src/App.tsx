import React, { useState, useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Navbar from './components/UI/Navbar';
import DashboardPage from './pages/Dashboard/DashboardPage';
import SAPPage from './pages/SAP/SAPPage';
import EnvoisPage from './pages/Envois/EnvoisPage';
import AdminPage from './pages/Admin/AdminPage';
import AuthPage from './pages/Auth/AuthPage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe(); // Unsubscribe to avoid memory leaks
  }, []);

  // While checking authentication, you might want to show a loading state
  if (isAuthenticated === null) {
    return <div>Checking authentication...</div>; // Or a loading spinner
  }

  return (
    <>
      {isAuthenticated ? (
        // User is authenticated, render the main application
        <>
          <Navbar />
          <main className="container mx-auto px-4 fade-in">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sap" element={<SAPPage />} />
              <Route path="/envois" element={<EnvoisPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/auth" element={<AuthPage />} /> {/* Keep auth route for potential manual navigation */}
            </Routes>
          </main>
        </>
      ) : (
        // User is not authenticated, render only the AuthPage
        <AuthPage />
      )}
    </>
  );
}

export default App;
