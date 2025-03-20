import React from 'react';

interface DashboardTilesProps {
  enCoursTickets: number;
  aCloturerTickets: number;
  totalTickets: number;
}

const DashboardTiles: React.FC<DashboardTilesProps> = ({ enCoursTickets, aCloturerTickets, totalTickets }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">En cours</h2>
          <p>{enCoursTickets} tickets</p>
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">À clôturer</h2>
          <p>{aCloturerTickets} tickets</p>
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Total</h2>
          <p>{totalTickets} tickets</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardTiles;
