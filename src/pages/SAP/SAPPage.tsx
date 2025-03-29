import React, { useState, useEffect, useCallback, useContext } from 'react';
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { fetchSectors, fetchTicketsBySectorService } from '../../services/firebaseService';
import { useUserSectors } from '../../context/UserContext';

// Assuming Ticket interface is defined elsewhere or here
interface Ticket {
  id: string;
  nomClient: string;
  description: string;
  statut: string;
  // ... other fields
}

const SAPPage: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectors, setSectors] = useState<any[]>([]);
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]);
  // Tickets state is now managed within TicketList
  // const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userSectors, loadingSectors, errorSectors } = useUserSectors(); // Use UserContext

  // Keep track of the key for TicketList to force re-render/refetch on refresh
  const [ticketListKey, setTicketListKey] = useState(0);

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
      // Automatically select the first allowed sector if none is selected
      // if (!selectedSector && userAllowedSectors.length > 0) {
      //   setSelectedSector(userAllowedSectors[0].id);
      // }
    } else if (sectors.length > 0 && !userSectors) {
       // If user context is loaded but user has no sectors (or not logged in)
       setFilteredSectors([]);
       setSelectedSector(null); // Ensure no sector is selected
    } else if (sectors.length > 0) {
       // If user context is still loading, show all sectors temporarily or handle as needed
       setFilteredSectors(sectors);
    } else {
       setFilteredSectors([]); // No sectors fetched yet
    }
  }, [sectors, userSectors]);


  // Removed loadTicketsForSector as it's now handled in TicketList
  // const loadTicketsForSector = useCallback(async (sector) => { ... }, []);
  // Removed useEffect for loadTicketsForSector

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSector = event.target.value || null; // Handle empty selection
    setSelectedSector(newSector);
    setSelectedTicket(null); // Close details when sector changes
    setIsModalOpen(false);
    setTicketListKey(prevKey => prevKey + 1); // Change key to force TicketList remount/refetch
  };

  const handleTicketSelect = (ticket: Ticket) => { // Use Ticket interface
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  // Function to refresh tickets by changing the key of TicketList
  const refreshTickets = useCallback(() => {
    setTicketListKey(prevKey => prevKey + 1);
    // Optionally close the modal on refresh
    // handleCloseModal();
  }, []);


  if (loadingSectors && sectors.length === 0) { // Show loading only if sectors aren't loaded yet
    return <p>Loading sectors...</p>; // Or a loading spinner
  }

  if (errorSectors) {
    return <p>Error loading sectors: {errorSectors}</p>;
  }


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Gestion des Tickets SAP</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Sector Selection and Ticket List */}
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
                disabled={loadingSectors && sectors.length === 0} // Disable only during initial load
              >
                <option value="">Choisir le secteur</option> {/* Allow unselecting */}
                {filteredSectors.length === 0 && !loadingSectors && (
                   <option value="" disabled>Aucun secteur disponible</option>
                )}
                {filteredSectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.id}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Pass selectedSector and key to TicketList */}
          <TicketList
            key={ticketListKey} // Add key here
            selectedSector={selectedSector}
            onTicketSelect={handleTicketSelect}
          />
          {/* Message removed as TicketList handles its own empty/loading states */}
          {/* {!selectedSector && (
            <p>Veuillez sélectionner un secteur pour afficher les tickets.</p>
          )} */}
        </div>
        {/* Right Column: Ticket Details Modal */}
        <div>
          {isModalOpen && selectedTicket && ( // Ensure selectedTicket is not null
            <TicketDetails
              ticket={selectedTicket}
              onClose={handleCloseModal}
              sectorId={selectedSector || ''} // Pass sectorId if needed by details
              onTicketUpdated={refreshTickets} // Pass refresh function
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SAPPage;
