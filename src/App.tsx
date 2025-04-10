import React, { useState, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/UI/Sidebar'; // Import Sidebar
import DashboardPage from './pages/Dashboard/DashboardPage';
import SAPPage from './pages/SAP/SAPPage';
import EnvoisPage from './pages/Envois/EnvoisPage';
import AdminPage from './pages/Admin/AdminPage';
import AuthPage from './pages/Auth/AuthPage';
import ArticleSearchPage from './pages/ArticleSearch/ArticleSearchPage'; // Import Article Search Page
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import CreateTicketPage from './pages/SAP/CreateTicketPage';
import { FaBars } from 'react-icons/fa'; // Icon for menu toggle

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for sidebar visibility
  const location = useLocation();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setSidebarOpen(false); // Close sidebar on logout
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Close sidebar on route change on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]); // Depend on route changes

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-jdc-black">
        <span className="loading loading-spinner loading-lg text-jdc-yellow"></span>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <div className="flex min-h-screen bg-jdc-black text-jdc-white">
          <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

          {/* Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Mobile Header (only shows menu button) */}
            <header className="sticky top-0 z-20 bg-jdc-black shadow-md lg:hidden h-16 flex items-center px-4 border-b border-base-300">
              <button
                onClick={toggleSidebar}
                className="btn btn-ghost btn-square text-jdc-white"
                aria-label="Ouvrir le menu"
              >
                <FaBars className="w-5 h-5" />
              </button>
               {/* Optional: Add mobile header title if needed */}
               {/* <h1 className="text-xl font-semibold ml-4">JDC SAP</h1> */}
            </header>

            {/* Main Content */}
            {/* Apply margin-left on large screens to offset fixed sidebar */}
            <main className="flex-grow p-4 sm:p-6 lg:p-8 content-area lg:ml-64 fade-in">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sap" element={<SAPPage />} />
                <Route path="/sap/create" element={<CreateTicketPage />} />
                <Route path="/envois" element={<EnvoisPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/article-search" element={<ArticleSearchPage />} /> {/* Add Article Search Route */}
                {/* Redirect authenticated users away from /auth */}
                <Route path="/auth" element={<DashboardPage />} />
              </Routes>
            </main>

            {/* Optional Footer */}
            {/* <footer className="footer footer-center p-4 bg-jdc-dark-gray text-jdc-light-gray border-t border-base-300 lg:ml-64 content-area">
              <div>
                <p>Copyright © {new Date().getFullYear()} - JDC</p>
              </div>
            </footer> */}
          </div>
        </div>
      ) : (
        // User is not authenticated, render only the AuthPage
        <AuthPage />
      )}
    </>
  );
}

export default App;
