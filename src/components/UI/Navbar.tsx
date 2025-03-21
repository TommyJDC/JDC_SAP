import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { signOut, getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserSectors } from '../../context/UserContext'; // Import useUserSectors hook


const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { userSectors, loadingSectors, errorSectors } = useUserSectors(); // Use UserContext

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
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">JDC SAP</Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link></li>
          <li><Link to="/envois" className={isActive('/envois')}>Envois</Link></li>
          <li><Link to="/sap" className={isActive('/sap')}>SAP</Link></li>
          {user && (
            <li><Link to="/admin" className={isActive('/admin')}>Admin</Link></li>
          )}
          {user ? (
            <li><button className="btn btn-ghost" onClick={handleLogout}>Logout</button></li>
          ) : (
            <li><Link to="/auth" className={isActive('/auth')}>Login</Link></li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
