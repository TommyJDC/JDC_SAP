import React, { useState, useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Navbar from './components/UI/Navbar';
import DashboardPage from './pages/Dashboard/DashboardPage';
import SAPPage from './pages/SAP/SAPPage';
import EnvoisPage from './pages/Envois/EnvoisPage';
import AdminPage from './pages/Admin/AdminPage';
import AuthPage from './pages/Auth/AuthPage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import CreateTicketPage from './pages/SAP/CreateTicketPage';

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
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100">
        <span className="loading loading-dots loading-lg"></span>
      </div>
    ); // Centered loading indicator
  }

  return (
    <>
      {isAuthenticated ? (
        // User is authenticated, render the main application
        <div className="flex flex-col min-h-screen bg-base-100"> {/* Ensure full height */}
          <Navbar />
          {/* Adjusted padding for main content area */}
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-grow fade-in">
            <Routes>
              <Route path="/" element=<DashboardPage /> />
              <Route path="/dashboard" element=<DashboardPage /> />
              <Route path="/sap" element=<SAPPage /> />
              <Route path="/sap/create" element=<CreateTicketPage /> />
              <Route path="/envois" element=<EnvoisPage /> />
              <Route path="/admin" element=<AdminPage /> />
              {/* Redirect authenticated users away from /auth */}
              <Route path="/auth" element=<DashboardPage /> />
            </Routes>
          </main>
          {/* Optional Footer */}
          {/* <footer className="footer footer-center p-4 bg-base-300 text-base-content">
            <div>
              <p>Copyright © {new Date().getFullYear()} - All right reserved by JDC</p>
            </div>
          </footer> */}
        </div>
      ) : (
        // User is not authenticated, render only the AuthPage
        <AuthPage />
      )}
    </>
  );
}

export default App;
