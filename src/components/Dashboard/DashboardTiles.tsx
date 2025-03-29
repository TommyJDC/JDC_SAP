import React from 'react';
import { FaShippingFast, FaTicketAlt, FaExclamationTriangle } from 'react-icons/fa'; // Import icons

interface DashboardTilesProps {
  envoisCount: number;
  ticketsCount: number;
  loading: boolean;
  error: string | null;
}

const DashboardTiles: React.FC<DashboardTilesProps> = ({ envoisCount, ticketsCount, loading, error }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Envois Tile - Apply text-primary-content to inner elements */}
      <div className="stats shadow bg-primary text-primary-content">
        <div className="stat">
          <div className="stat-figure text-primary-content"> {/* Ensure icon also uses contrast color */}
            <FaShippingFast size={32} />
          </div>
          <div className="stat-title text-primary-content">Envois Actifs</div> {/* Explicit text color */}
          {loading ? (
            <div className="stat-value text-primary-content"><span className="loading loading-dots loading-md"></span></div>
          ) : error ? (
             <div className="stat-value text-error"><FaExclamationTriangle/></div> // Error text is usually visible
          ) : (
            <div className="stat-value text-primary-content">{envoisCount}</div> /* Explicit text color */
          )}
          <div className="stat-desc text-primary-content opacity-75">Nombre total d'envois</div> {/* Explicit text color + slight opacity */}
        </div>
      </div>

      {/* Tickets Tile - Apply text-secondary-content to inner elements */}
      <div className="stats shadow bg-secondary text-secondary-content">
        <div className="stat">
          <div className="stat-figure text-secondary-content"> {/* Ensure icon also uses contrast color */}
            <FaTicketAlt size={32} />
          </div>
          <div className="stat-title text-secondary-content">Tickets SAP Ouverts</div> {/* Explicit text color */}
           {loading ? (
            <div className="stat-value text-secondary-content"><span className="loading loading-dots loading-md"></span></div>
          ) : error ? (
             <div className="stat-value text-error"><FaExclamationTriangle/></div> // Error text is usually visible
          ) : (
            <div className="stat-value text-secondary-content">{ticketsCount}</div> /* Explicit text color */
          )}
          <div className="stat-desc text-secondary-content opacity-75">Total tickets tous secteurs</div> {/* Explicit text color + slight opacity */}
        </div>
      </div>

      {/* Placeholder Tile 1 - Apply text-accent-content to inner elements */}
      <div className="stats shadow bg-accent text-accent-content">
        <div className="stat">
          {/* <div className="stat-figure text-accent-content">
             Icon
          </div> */}
          <div className="stat-title text-accent-content">Autre Statistique</div> {/* Explicit text color */}
          <div className="stat-value text-accent-content">...</div> {/* Explicit text color */}
          <div className="stat-desc text-accent-content opacity-75">Description</div> {/* Explicit text color + slight opacity */}
        </div>
      </div>

      {/* Placeholder Tile 2 - Apply text-base-content (or theme default) */}
      <div className="stats shadow"> {/* No specific bg, uses default base */}
        <div className="stat">
          {/* <div className="stat-figure text-info"> {/* Or text-base-content */}
             {/* Icon */}
          {/* </div> */}
          <div className="stat-title text-base-content">Encore une Statistique</div> {/* Explicit text color */}
          <div className="stat-value text-base-content">...</div> {/* Explicit text color */}
          <div className="stat-desc text-base-content opacity-75">Description</div> {/* Explicit text color + slight opacity */}
        </div>
      </div>
    </div>
  );
};

export default DashboardTiles;
