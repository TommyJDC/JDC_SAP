import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

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
        backgroundColor: 'rgb(255, 99, 132)',
      },
      {
        label: 'À clôturer',
        data: [aCloturerTickets],
        backgroundColor: 'rgb(54, 162, 235)',
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
        display: false, // No title for the chart itself, tile has the title
        text: `Tickets par statut pour ${sectorName}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };


  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{sectorName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <p>En cours: {enCoursTickets} tickets</p>
          </div>
          <div>
            <p>À clôturer: {aCloturerTickets} tickets</p>
          </div>
          <div>
            <p>Total: {totalTickets} tickets</p>
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
