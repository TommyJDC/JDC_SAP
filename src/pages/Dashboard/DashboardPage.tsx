import React, { useState, useEffect } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { fetchSectors, fetchTicketsBySector } from '../../services/firebaseService';
import { useUserSectors } from '../../context/UserContext'; // Import UserSectors context

const DashboardPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectorTicketCounts, setSectorTicketCounts] = useState<{ [sectorId: string]: any }>({});
  const { userSectors, loadingSectors, errorSectors } = useUserSectors(); // Use user sectors from context
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]); // Sectors filtered by user roles


  useEffect(() => {
    const loadSectors = async () => {
      const sectorsData = await fetchSectors();
      setSectors(sectorsData);
    };
    loadSectors();
  }, []);

  useEffect(() => {
    // Filter sectors based on userSectors from context
    if (userSectors) {
      const filtered = sectors.filter(sector => userSectors.includes(sector.id));
      setFilteredSectors(filtered);
    } else {
      setFilteredSectors(sectors); // If no userSectors, show all sectors (or handle as needed)
    }
  }, [sectors, userSectors]);


  useEffect(() => {
    const fetchAllTickets = async () => {
      let allTickets: any[] = [];
      let countsBySector: { [sectorId: string]: any } = {};

      const sectorsToUse = userSectors ? filteredSectors : sectors; // Use filtered sectors if userSectors exist

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
    <div>
      <h2 className="text-2xl font-bold mb-4">Tableau de bord</h2>
      <div className="mb-4">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Secteur</span>
          </label>
          <select
            className="select select-bordered"
            value={selectedSector || ''}
            onChange={handleSectorChange}
          >
            <option disabled value="">Tous les secteurs</option>
            {filteredSectors.map(sector => ( // Use filteredSectors here
              <option key={sector.id} value={sector.id}>{sector.id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-2">Carte des tickets ouverts</h3>
        <InteractiveMap tickets={filteredTickets} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-4">
        {filteredSectors.map(sector => ( // Use filteredSectors here
          <DashboardTiles
            key={sector.id}
            sectorName={sector.id}
            enCoursTickets={sectorTicketCounts[sector.id]?.enCoursTickets || 0}
            aCloturerTickets={sectorTicketCounts[sector.id]?.aCloturerTickets || 0}
            totalTickets={sectorTicketCounts[sector.id]?.totalTickets || 0}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
