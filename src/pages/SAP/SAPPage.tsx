import React, { useState, useEffect, useCallback, useContext } from 'react';
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { fetchSectors, fetchTicketsBySectorService } from '../../services/firebaseService';
import { useUserSectors } from '../../context/UserContext';

const SAPPage: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectors, setSectors] = useState<any[]>([]);
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]); // New state for filtered sectors
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userSectors, loadingSectors, errorSectors } = useUserSectors(); // Use UserContext

  useEffect(() => {
    const loadSectors = async () => {
      const sectorsData = await fetchSectors();
      console.log("Fetched sectors in SAPPage:", sectorsData);
      setSectors(sectorsData);
    };
    loadSectors();
  }, []);

  // Effect to filter sectors based on userSectors
  useEffect(() => {
    if (userSectors && sectors.length > 0) {
      const userAllowedSectors = sectors.filter(sector => userSectors.includes(sector.id));
      setFilteredSectors(userAllowedSectors);
    } else if (sectors.length > 0 && !userSectors) {
      setFilteredSectors([]); // No sectors if userSectors is not loaded or user is not logged in
    } else {
      setFilteredSectors(sectors); // Show all sectors if userSectors is still loading or no user context
    }
  }, [sectors, userSectors]);


  const loadTicketsForSector = useCallback(async (sector) => {
    if (sector) {
      try {
        const ticketsData = await fetchTicketsBySectorService(sector);
        setTickets(ticketsData);
      } catch (error) {
        console.error("Failed to load tickets:", error);
        setTickets([]);
      }
    } else {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    loadTicketsForSector(selectedSector);
  }, [selectedSector, loadTicketsForSector]);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSector(event.target.value);
    setSelectedTicket(null);
    setIsModalOpen(false);
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  const refreshTickets = useCallback(() => {
    loadTicketsForSector(selectedSector);
  }, [selectedSector, loadTicketsForSector]);


  if (loadingSectors) {
    return <p>Loading sectors...</p>; // Or a loading spinner
  }

  if (errorSectors) {
    return <p>Error loading sectors: {errorSectors}</p>;
  }


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Gestion des Tickets SAP</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="mb-4">
            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Secteur</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedSector || ''}
                onChange={handleSectorChange}
                disabled={loadingSectors} // Disable select while loading
              >
                <option disabled value="">Choisir le secteur</option>
                {filteredSectors.map(sector => ( // Use filteredSectors here
                  <option key={sector.id} value={sector.id}>{sector.id}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedSector && (
            <TicketList secteur={selectedSector} onTicketSelect={handleTicketSelect} />
          )}
          {!selectedSector && (
            <p>Veuillez sélectionner un secteur pour afficher les tickets.</p>
          )}
        </div>
        <div>
          {isModalOpen && <TicketDetails ticket={selectedTicket} onClose={handleCloseModal} sectorId={selectedSector || ''} onTicketUpdated={refreshTickets} />}
        </div>
      </div>
    </div>
  );
};

export default SAPPage;
