import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, TicketIcon, UsersIcon, LockIcon } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <div className="navbar bg-base-100">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
          <HomeIcon className="mr-2" />
          Support Tickets
        </Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/dashboard"><HomeIcon className="mr-2" />Dashboard</Link></li>
          <li><Link to="/sap"><TicketIcon className="mr-2" />Tickets SAP</Link></li>
          <li><Link to="/envois"><TicketIcon className="mr-2" />Envois</Link></li>
          <li><Link to="/admin"><UsersIcon className="mr-2" />Admin</Link></li>
          <li><Link to="/auth"><LockIcon className="mr-2" />Auth</Link></li>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
