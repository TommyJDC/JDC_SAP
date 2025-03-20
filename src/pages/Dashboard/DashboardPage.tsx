import React from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';

const DashboardPage: React.FC = () => {
  // Dummy data for tiles
  const dashboardData = {
    enCoursTickets: 15,
    aCloturerTickets: 5,
    totalTickets: 20,
  };

  // Dummy data for map tickets
  const mapTickets = [
    { id: 'T123', coordinates: { lat: 51.505, lng: -0.09 } },
    { id: 'T456', coordinates: { lat: 51.510, lng: -0.10 } },
    // ... more tickets
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tableau de bord</h2>
      <DashboardTiles
        enCoursTickets={dashboardData.enCoursTickets}
        aCloturerTickets={dashboardData.aCloturerTickets}
        totalTickets={dashboardData.totalTickets}
      />
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Carte des tickets ouverts</h3>
        <InteractiveMap tickets={mapTickets} />
      </div>
    </div>
  );
};

export default DashboardPage;
