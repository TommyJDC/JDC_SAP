import React from 'react';
    import { FaTicketAlt, FaMapMarkedAlt, FaSpinner, FaExclamationTriangle, FaEnvelopeOpenText } from 'react-icons/fa';

    interface DashboardTilesProps {
      envoisCount: number;
      ticketsCount: number;
      loading: boolean;
      error: string | null;
      envoisCountYesterday?: number;
      ticketsCountYesterday?: number;
      rmaTicketsCount: number;
      rmaTicketsCountYesterday?: number;
      clientCtnCount: number;
      clientCtnCountYesterday?: number;
      newTicketsCount: number;
      newTicketsCountYesterday?: number;
    }

    const StatTile: React.FC<{
      title: string;
      value: number | string;
      icon: React.ReactNode;
      loading?: boolean;
      error?: boolean;
      increase?: number;
    }> = ({ title, value, icon, loading = false, error = false, increase = 0 }) => (
      <div className="dashboard-tile flex flex-col p-4 rounded-md bg-jdc-dark-gray border border-base-300 items-center text-center">
        <div className="flex flex-col items-center space-y-2 mb-2">
          <div className="p-3 rounded-full bg-jdc-black text-jdc-yellow">
            {loading ? <FaSpinner className="animate-spin h-6 w-6" /> : error ? <FaExclamationTriangle className="h-6 w-6 text-red-500" /> : icon}
          </div>
          <div>
            <p className="text-sm text-jdc-light-gray font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-semibold text-jdc-white">
              {loading ? '...' : error ? 'Erreur' : value}
            </p>
          </div>
        </div>
        {increase !== 0 && !loading && !error && (
          <div className="mt-1 text-sm text-jdc-green">
            {increase > 0 ? `+${increase} depuis hier` : `${increase} depuis hier`}
          </div>
        )}
      </div>
    );

    const DashboardTiles: React.FC<DashboardTilesProps> = ({
      envoisCount,
      ticketsCount,
      loading,
      error,
      envoisCountYesterday = 0,
      ticketsCountYesterday = 0,
      rmaTicketsCount,
      rmaTicketsCountYesterday = 0,
      clientCtnCount,
      clientCtnCountYesterday = 0,
      newTicketsCount,
      newTicketsCountYesterday = 0,
    }) => {
      const ticketsIncrease = ticketsCount - ticketsCountYesterday;
      const rmaTicketsIncrease = rmaTicketsCount - rmaTicketsCountYesterday;
      const clientCtnIncrease = clientCtnCount - clientCtnCountYesterday;
      const newTicketsIncrease = newTicketsCount - newTicketsCountYesterday;


      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatTile
            title="Tickets SAP Actifs"
            value={ticketsCount}
            icon={<FaTicketAlt className="h-6 w-6" />}
            loading={loading}
            error={!!error}
            increase={ticketsIncrease}
          />
          <StatTile
            title="Envoi depuis CTN chez le client"
            value={clientCtnCount}
            icon={<FaMapMarkedAlt className="h-6 w-6" />}
            loading={loading}
            error={!!error}
            increase={clientCtnIncrease}
          />
          <StatTile
            title="Tickets Demande de RMA"
            value={rmaTicketsCount}
            icon={<FaEnvelopeOpenText className="h-6 w-6" />}
            loading={loading}
            error={!!error}
            increase={rmaTicketsIncrease}
          />
          <StatTile
            title="Tickets Nouveaux"
            value={newTicketsCount}
            icon={<FaTicketAlt className="h-6 w-6" />}
            loading={loading}
            error={!!error}
            increase={newTicketsIncrease}
          />
        </div>
      );
    };

    export default DashboardTiles;
