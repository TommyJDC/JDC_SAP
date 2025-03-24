import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserSectors } from '../../context/UserContext';
import { FaChartBar, FaBox, FaSitemap, FaUser, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { userSectors, loadingSectors, errorSectors } = useUserSectors();

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = authInstance.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  if (loadingSectors) {
    return (
      <nav className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="text-2xl font-bold text-white">
            JDC SAP <span className="emoticon">🚀</span>
          </div>
          <div>Loading...</div> {/* Display a loading message */}
        </div>
      </nav>
    );
  }

  if (errorSectors) {
    return (
      <nav className="bg-gray-800 shadow-md py-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="text-2xl font-bold text-white">
            JDC SAP <span className="emoticon">🚀</span>
          </div>
          <div>Error: {errorSectors}</div> {/* Display an error message */}
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-800 shadow-md py-4">
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link to="/" className="text-2xl font-bold text-white hover:text-blue-300 transition duration-200 sm:text-base"> {/* Reduced size on small screens */}
          JDC SAP <span className="emoticon">🚀</span>
        </Link>
        <ul className="flex space-x-6 sm:space-x-2"> {/* Reduced spacing on small screens */}
          <li>
            <Link to="/dashboard" className={`btn btn-ghost ${isActive('/dashboard')}`}>
              <FaChartBar className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
              <span className="hidden sm:inline">Dashboard</span> {/* Hide text on very small screens, show on slightly larger */}
            </Link>
          </li>
          <li>
            <Link to="/envois" className={`btn btn-ghost ${isActive('/envois')}`}>
              <FaBox className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
              <span className="hidden sm:inline">Envois</span> {/* Hide text on very small screens, show on slightly larger */}
            </Link>
          </li>
          <li>
            <Link to="/sap" className={`btn btn-ghost ${isActive('/sap')}`}>
              <FaSitemap className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
              <span className="hidden sm:inline">SAP</span> {/* Hide text on very small screens, show on slightly larger */}
            </Link>
          </li>
          {user && (
            <li>
              <Link to="/admin" className={`btn btn-ghost ${isActive('/admin')}`}>
                <FaUser className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
                <span className="hidden sm:inline">Admin</span> {/* Hide text on very small screens, show on slightly larger */}
              </Link>
            </li>
          )}
          {user ? (
            <li>
              <button className="btn btn-ghost" onClick={handleLogout}>
                <FaSignOutAlt className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
                <span className="hidden sm:inline">Logout</span> {/* Hide text on very small screens, show on slightly larger */}
              </button>
            </li>
          ) : (
            <li>
              <Link to="/auth" className={`btn btn-ghost ${isActive('/auth')}`}>
                <FaSignInAlt className="icon sm:w-5 sm:h-5" /> {/* Reduced icon size on small screens */}
                <span className="hidden sm:inline">Login</span> {/* Hide text on very small screens, show on slightly larger */}
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
