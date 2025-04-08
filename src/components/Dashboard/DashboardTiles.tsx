import React from 'react';
import { FaTicketAlt, FaMapMarkedAlt, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface DashboardTilesProps {
  envoisCount: number;
  ticketsCount: number;
  loading: boolean;
  error: string | null;
  // Add props for sector-specific stats later
  // sectorStats?: { [sectorId: string]: { tickets: number; envois: number } };
}

const StatTile: React.FC<{ title: string; value: number | string; icon: React.ReactNode; loading?: boolean; error?: boolean }> = ({ title, value, icon, loading = false, error = false }) => (
  <div className="dashboard-tile flex items-center space-x-4 p-4 rounded-md bg-jdc-dark-gray border border-base-300"> {/* Use JDC dark gray */}
    <div className="p-3 rounded-full bg-jdc-black text-jdc-yellow"> {/* Icon background */}
      {loading ? <FaSpinner className="animate-spin h-6 w-6" /> : error ? <FaExclamationTriangle className="h-6 w-6 text-red-500" /> : icon}
    </div>
    <div>
      <p className="text-sm text-jdc-light-gray font-medium uppercase tracking-wider">{title}</p> {/* Lighter gray text */}
      <p className="text-2xl font-semibold text-jdc-white"> {/* White text */}
        {loading ? '...' : error ? 'Erreur' : value}
      </p>
    </div>
  </div>
);


const DashboardTiles: React.FC<DashboardTilesProps> = ({ envoisCount, ticketsCount, loading, error }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatTile
        title="Tickets SAP Actifs"
        value={ticketsCount}
        icon={<FaTicketAlt className="h-6 w-6" />}
        loading={loading}
        error={!!error}
      />
      <StatTile
        title="Envois Planifiés"
        value={envoisCount}
        icon={<FaMapMarkedAlt className="h-6 w-6" />}
        loading={loading}
        error={!!error}
      />
      {/* Add more tiles here */}
       <StatTile
        title="Stat Placeholder 1"
        value={"N/A"} // Replace with actual data later
        icon={<FaTicketAlt className="h-6 w-6" />} // Choose appropriate icon
        loading={false} // Set loading state if fetching this data
        error={false} // Set error state
      />
       <StatTile
        title="Stat Placeholder 2"
        value={"N/A"} // Replace with actual data later
        icon={<FaMapMarkedAlt className="h-6 w-6" />} // Choose appropriate icon
        loading={false}
        error={false}
      />
    </div>
  );
};

export default DashboardTiles;
