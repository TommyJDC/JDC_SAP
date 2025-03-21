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

  return (
    <nav className="bg-gray-800 shadow-md py-4">
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link to="/" className="text-2xl font-bold text-white hover:text-blue-300 transition duration-200">JDC SAP <span className="emoticon">🚀</span></Link>
        <ul className="flex space-x-6">
          <li><Link to="/dashboard" className={`btn btn-ghost ${isActive('/dashboard')}`}>
            <FaChartBar className="icon" /> Dashboard
          </Link></li>
          <li><Link to="/envois" className={`btn btn-ghost ${isActive('/envois')}`}>
            <FaBox className="icon" /> Envois
          </Link></li>
          <li><Link to="/sap" className={`btn btn-ghost ${isActive('/sap')}`}>
            <FaSitemap className="icon" /> SAP
          </Link></li>
          {user && (
            <li><Link to="/admin" className={`btn btn-ghost ${isActive('/admin')}`}>
              <FaUser className="icon" /> Admin
            </Link></li>
          )}
          {user ? (
            <li><button className="btn btn-ghost" onClick={handleLogout}>
              <FaSignOutAlt className="icon" /> Logout
            </button></li>
          ) : (
            <li><Link to="/auth" className={`btn btn-ghost ${isActive('/auth')}`}>
              <FaSignInAlt className="icon" /> Login
            </Link></li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
