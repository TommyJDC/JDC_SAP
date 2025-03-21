import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FaBuilding } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardTilesProps {
  sectorName: string;
  enCoursTickets: number;
  aCloturerTickets: number;
  totalTickets: number;
}

const DashboardTiles: React.FC<DashboardTilesProps> = ({ sectorName, enCoursTickets, aCloturerTickets, totalTickets }) => {
  const chartData = {
    labels: ['Tickets'],
    datasets: [
      {
        label: 'En cours',
        data: [enCoursTickets],
        backgroundColor: '#f56565', // Red
        hoverBackgroundColor: '#ed8936',
      },
      {
        label: 'À clôturer',
        data: [aCloturerTickets],
        backgroundColor: '#63b3ed', // Blue
        hoverBackgroundColor: '#4299e1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
        text: `Tickets par statut pour ${sectorName}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="dashboard-tile">
      <div className="card-body p-6">
        <h2 className="card-title text-xl font-semibold text-white mb-2">
          <FaBuilding className="icon" /> {sectorName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-white">En cours: <span className="font-medium">{enCoursTickets}</span></p>
          </div>
          <div>
            <p className="text-white">À clôturer: <span className="font-medium">{aCloturerTickets}</span></p>
          </div>
          <div>
            <p className="text-white">Total: <span className="font-medium">{totalTickets}</span></p>
          </div>
        </div>
        <div className="mt-4">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default DashboardTiles;
