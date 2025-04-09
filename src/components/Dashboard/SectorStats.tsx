import React from 'react';
    import { Bar } from 'react-chartjs-2';
    import {
      Chart as ChartJS,
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend,
    } from 'chart.js';

    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend
    );

    interface SectorData {
      sectorName: string;
      ticketCount: number;
    }

    interface SectorStatsProps {
      sectorStats: SectorData[];
    }

    const SectorStats: React.FC<SectorStatsProps> = ({ sectorStats }) => {
      // Define colors for each sector
      const sectorColors = {
        'CHR': 'rgba(54, 162, 235, 0.7)',   // Blue
        'HACCP': 'rgba(255, 206, 86, 0.7)',  // Yellow
        'Kezia': 'rgba(75, 192, 192, 0.7)',  // Green
        'Tabac': 'rgba(255, 99, 132, 0.7)',  // Red
        'Default': 'rgba(153, 102, 255, 0.7)' // Purple for others
      };

      const chartData = {
        labels: sectorStats.map(sector => sector.sectorName),
        datasets: [
          {
            label: 'Tickets',
            data: sectorStats.map(sector => sector.ticketCount),
            backgroundColor: sectorStats.map(sector => sectorColors[sector.sectorName] || sectorColors['Default']),
            borderColor: sectorStats.map(sector => sectorColors[sector.sectorName] || sectorColors['Default']),
            borderWidth: 1,
          },
        ],
      };

      const chartOptions = {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Nombre de tickets par secteur',
            color: '#fff',
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#fff'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            beginAtZero: true,
          },
          y: {
            ticks: {
              color: '#fff',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
          },
        },
      };

      return (
        <div className="card bg-jdc-dark-gray shadow-lg border border-base-300">
          <div className="card-body p-4 md:p-6">
            <h2 className="card-title text-xl font-semibold text-jdc-white mb-4">
              Statistiques par Secteur
            </h2>
            <div>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      );
    };

    export default SectorStats;
