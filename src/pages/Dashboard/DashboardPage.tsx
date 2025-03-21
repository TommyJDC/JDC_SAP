import React, { useState, useEffect } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import { fetchSectors, fetchTicketsBySector } from '../../services/firebaseService';
import { useUserSectors } from '../../context/UserContext';
import { FaHome, FaMapMarkedAlt, FaFilter } from 'react-icons/fa';

const DashboardPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectorTicketCounts, setSectorTicketCounts] = useState<{ [sectorId: string]: any }>({});
  const { userSectors, loadingSectors, errorSectors } = useUserSectors();
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]);

  useEffect(() => {
    const loadSectors = async () => {
      const sectorsData = await fetchSectors();
      setSectors(sectorsData);
    };
    loadSectors();
  }, []);

  useEffect(() => {
    if (userSectors) {
      const filtered = sectors.filter(sector => userSectors.includes(sector.id));
      setFilteredSectors(filtered);
    } else {
      setFilteredSectors(sectors);
    }
  }, [sectors, userSectors]);

  useEffect(() => {
    const fetchAllTickets = async () => {
      let allTickets: any[] = [];
      let countsBySector: { [sectorId: string]: any } = {};

      const sectorsToUse = userSectors ? filteredSectors : sectors;

      for (const sector of sectorsToUse) {
        try {
          const ticketsForSector = await fetchTicketsBySector(sector.id);
          allTickets = [...allTickets, ...ticketsForSector];

          countsBySector[sector.id] = {
            enCoursTickets: ticketsForSector.filter(ticket => ticket.status === 'En cours').length,
            aCloturerTickets: ticketsForSector.filter(ticket => ticket.status === 'À clôturer').length,
            totalTickets: ticketsForSector.length,
          };
        } catch (error) {
          console.error(`Error fetching tickets for sector ${sector.id}:`, error);
          countsBySector[sector.id] = {
            enCoursTickets: 0,
            aCloturerTickets: 0,
            totalTickets: 0,
          };
        }
      }
      setTickets(allTickets);
      setSectorTicketCounts(countsBySector);
    };

    if (sectors.length > 0) {
      fetchAllTickets();
    }
  }, [sectors, filteredSectors, userSectors]);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSector(event.target.value);
  };

  const filteredTickets = selectedSector
    ? tickets.filter(ticket => ticket.secteur === selectedSector)
    : tickets;

  return (
    <div className="container mx-auto py-8 fade-in">
      <h2 className="text-3xl font-bold text-white mb-6">
        <FaHome className="icon" /> Tableau de bord
      </h2>

      <div className="mb-6">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text text-white"><FaFilter className="icon" /> Secteur</span>
          </label>
          <select
            className="select select-bordered"
            value={selectedSector || ''}
            onChange={handleSectorChange}
          >
            <option disabled value="">Tous les secteurs</option>
            {filteredSectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSectors.map(sector => (
          <DashboardTiles
            key={sector.id}
            sectorName={sector.id}
            enCoursTickets={sectorTicketCounts[sector.id]?.enCoursTickets || 0}
            aCloturerTickets={sectorTicketCounts[sector.id]?.aCloturerTickets || 0}
            totalTickets={sectorTicketCounts[sector.id]?.totalTickets || 0}
          />
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-2">
          <FaMapMarkedAlt className="icon" /> Carte des tickets ouverts
        </h3>
        <InteractiveMap tickets={filteredTickets} />
      </div>
    </div>
  );
};

export default DashboardPage;
