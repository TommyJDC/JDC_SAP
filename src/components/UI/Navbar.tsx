import React from 'react';
import { Link } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { FaHome, FaListAlt, FaCog, FaPlus, FaSignOutAlt, FaBars } from 'react-icons/fa'; // Added FaBars and FaSignOutAlt

const Navbar: React.FC = () => {
  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // Redirecting after sign-out is handled by the Router in App.tsx
    } catch (error) {
      console.error("Sign out error", error);
      // Handle sign out error, e.g., display a message to the user
    }
  };

  const menuItems = (
    <>
      <li><Link to="/dashboard" title="Dashboard"><FaHome className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">Dashboard</span></Link></li>
      <li><Link to="/sap" title="Tickets SAP"><FaListAlt className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">SAP Tickets</span></Link></li>
      <li><Link to="/sap/create" title="Créer Ticket SAP"><FaPlus className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">Créer Ticket</span></Link></li>
      <li><Link to="/envois" title="Envois"><FaListAlt className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">Envois</span></Link></li>
      <li><Link to="/admin" title="Admin"><FaCog className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">Admin</span></Link></li>
      <li>
        <button className="btn btn-ghost" onClick={handleSignOut} title="Se déconnecter">
          <FaSignOutAlt className="inline-block mr-1 md:mr-2"/> <span className="hidden md:inline">Déconnexion</span>
        </button>
      </li>
    </>
  );


  return (
    <div className="navbar bg-base-200 shadow-md mb-6 sticky top-0 z-50 rounded-box mx-auto max-w-7xl mt-2"> {/* Added sticky, z-index, rounded, margin, max-width */}
      <div className="navbar-start">
         {/* Dropdown for mobile */}
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden"> {/* Show only on smaller screens */}
            <FaBars className="h-5 w-5" />
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
             {/* Mobile Menu Items - simplified text */}
             <li><Link to="/dashboard"><FaHome className="inline-block mr-2"/> Dashboard</Link></li>
             <li><Link to="/sap"><FaListAlt className="inline-block mr-2"/> SAP Tickets</Link></li>
             <li><Link to="/sap/create"><FaPlus className="inline-block mr-2"/> Créer Ticket</Link></li>
             <li><Link to="/envois"><FaListAlt className="inline-block mr-2"/> Envois</Link></li>
             <li><Link to="/admin"><FaCog className="inline-block mr-2"/> Admin</Link></li>
             <li><button onClick={handleSignOut}><FaSignOutAlt className="inline-block mr-2"/> Déconnexion</button></li>
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost normal-case text-xl">JDC SAP</Link>
      </div>
      <div className="navbar-center hidden lg:flex"> {/* Hide on small screens, show on large */}
        <ul className="menu menu-horizontal px-1">
          {menuItems} {/* Use the defined menu items */}
        </ul>
      </div>
       {/* Optional: Add navbar-end if needed for user profile icon etc. */}
       {/* <div className="navbar-end"> ... </div> */}
    </div>
  );
};

export default Navbar;
