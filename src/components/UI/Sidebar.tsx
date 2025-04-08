import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { FaHome, FaListAlt, FaCog, FaPlus, FaSignOutAlt, FaMapMarkedAlt, FaTicketAlt, FaUsers, FaChartBar } from 'react-icons/fa'; // Added more relevant icons

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, toggleSidebar }) => {

  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // Navigation is handled by App.tsx based on auth state
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const commonLinkClasses = "flex items-center px-4 py-3 text-jdc-white hover:bg-jdc-dark-gray rounded transition-colors duration-150";
  const activeLinkClasses = "active-link"; // Defined in index.css

  const menuItems = (
    <>
      <li>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
          onClick={window.innerWidth < 1024 ? toggleSidebar : undefined} // Close sidebar on mobile click
        >
          <FaChartBar className="icon" /> Tableau de Bord
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/sap"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
          onClick={window.innerWidth < 1024 ? toggleSidebar : undefined}
        >
          <FaTicketAlt className="icon" /> Tickets SAP
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/sap/create"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
          onClick={window.innerWidth < 1024 ? toggleSidebar : undefined}
        >
          <FaPlus className="icon" /> Créer Ticket
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/envois"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
          onClick={window.innerWidth < 1024 ? toggleSidebar : undefined}
        >
          <FaMapMarkedAlt className="icon" /> Envois
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/admin"
          className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : ''}`}
          onClick={window.innerWidth < 1024 ? toggleSidebar : undefined}
        >
          <FaUsers className="icon" /> Admin
        </NavLink>
      </li>
    </>
  );

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="flex items-center justify-center h-20 border-b border-base-300">
           {/* You can replace text with an actual logo if available */}
          <Link to="/" className="text-2xl font-bold text-jdc-yellow px-4">JDC SAP</Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          <ul className="menu p-0"> {/* Use menu class for structure */}
            {menuItems}
          </ul>
        </nav>

        {/* Footer/Logout */}
        <div className="px-4 py-4 border-t border-base-300">
          <button
            onClick={handleSignOut}
            className={`${commonLinkClasses} w-full justify-start`}
          >
            <FaSignOutAlt className="icon" /> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
