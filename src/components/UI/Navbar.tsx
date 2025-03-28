import React from 'react';
import { Link, NavLink } from 'react-router-dom'; // Use NavLink for active styling
import { signOut, getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaChartBar, FaBox, FaSitemap, FaUserCog, FaSignOutAlt, FaSignInAlt, FaRocket } from 'react-icons/fa'; // Changed Admin icon

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Set loading to false once auth state is determined
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigate('/auth'); // Redirect to login page after logout
    } catch (error) {
      console.error('Logout error:', error);
      // Optionally show an error message to the user
    }
  };

  // Helper function for NavLink className
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `btn btn-ghost ${isActive ? 'active' : ''}`;

  return (
    <nav className="navbar bg-base-200 shadow-lg mb-6 rounded-box sticky top-0 z-50"> {/* Make navbar sticky */}
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl text-primary hover:bg-transparent">
          <FaRocket className="icon" /> JDC SAP
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex"> {/* Center links on larger screens */}
        <ul className="menu menu-horizontal px-1">
          <li>
            <NavLink to="/dashboard" className={getNavLinkClass}>
              <FaChartBar className="icon" />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/envois" className={getNavLinkClass}>
              <FaBox className="icon" />
              <span>Envois</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sap" className={getNavLinkClass}>
              <FaSitemap className="icon" />
              <span>SAP</span>
            </NavLink>
          </li>
          {!loading && user && ( // Show Admin link only if user is logged in and not loading
            <li>
              <NavLink to="/admin" className={getNavLinkClass}>
                <FaUserCog className="icon" /> {/* Changed icon */}
                <span>Admin</span>
              </NavLink>
            </li>
          )}
        </ul>
      </div>
      <div className="navbar-end">
        {loading ? (
          <span className="loading loading-spinner loading-sm mr-4"></span> // Show spinner while loading auth state
        ) : user ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                {/* Placeholder for user avatar - replace with actual image if available */}
                <span className="text-xl">{user.email?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-300 rounded-box w-52">
              <li>
                <button onClick={handleLogout} className="text-error">
                  <FaSignOutAlt className="icon" /> Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <NavLink to="/auth" className="btn btn-ghost">
            <FaSignInAlt className="icon" />
            <span>Login</span>
          </NavLink>
        )}
         {/* Dropdown for mobile */}
         <div className="dropdown dropdown-end lg:hidden">
           <label tabIndex={0} className="btn btn-ghost lg:hidden">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
           </label>
           <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-300 rounded-box w-52">
             <li><NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}><FaChartBar className="icon" />Dashboard</NavLink></li>
             <li><NavLink to="/envois" className={({isActive}) => isActive ? 'active' : ''}><FaBox className="icon" />Envois</NavLink></li>
             <li><NavLink to="/sap" className={({isActive}) => isActive ? 'active' : ''}><FaSitemap className="icon" />SAP</NavLink></li>
             {!loading && user && (
               <li><NavLink to="/admin" className={({isActive}) => isActive ? 'active' : ''}><FaUserCog className="icon" />Admin</NavLink></li>
             )}
           </ul>
         </div>
      </div>
    </nav>
  );
};

export default Navbar;
