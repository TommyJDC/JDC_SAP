import React, { useState, useEffect } from 'react';
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { fetchSectors } from '../../services/firebaseService';
import { useUserSectors } from '../../context/UserContext';
import { FaFilter, FaSearch, FaBuilding, FaHashtag, FaFileAlt, FaInfoCircle } from 'react-icons/fa'; // Added icons

// Define the Ticket interface locally or import if shared
interface Ticket {
  id: string;
  raisonSociale: string;
  description?: string;
  statut: string;
  adresse?: string;
  codeClient?: string;
  date?: string;
  demandeSAP?: string;
  messageId?: string;
  numeroSAP?: string;
  telephone?: string;
  secteur: string; // Ensure secteur is part of the ticket data
  // ... other fields
}

const SAPPage: React.FC = () => {
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { userSectors } = useUserSectors();
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]);

  // State for filters
  const [searchTermRaisonSociale, setSearchTermRaisonSociale] = useState('');
  const [searchTermCodeClient, setSearchTermCodeClient] = useState('');
  const [searchTermNumeroSAP, setSearchTermNumeroSAP] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '' means all statuses

  useEffect(() => {
    const loadSectors = async () => {
      const sectorsData = await fetchSectors();
      // Filter SAP-related sectors if necessary, or use all fetched sectors
      // For now, assuming all fetched sectors are relevant for SAP tickets
      setSectors(sectorsData);
    };
    loadSectors();
  }, []);

  useEffect(() => {
    // Filter sectors based on user permissions
    if (userSectors) {
      const filtered = sectors.filter(sector => userSectors.includes(sector.id));
      setFilteredSectors(filtered);
      // If a selected sector is no longer allowed, reset selection
      if (selectedSector && !userSectors.includes(selectedSector)) {
        setSelectedSector(null);
        setSelectedTicket(null); // Also clear ticket selection
      }
    } else {
      setFilteredSectors(sectors); // Show all sectors if no specific user sectors
    }
  }, [sectors, userSectors, selectedSector]);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSector = event.target.value;
    setSelectedSector(newSector);
    setSelectedTicket(null); // Reset ticket selection when sector changes
    // Reset filters when sector changes? Optional, depends on desired UX
    // setSearchTermRaisonSociale('');
    // setSearchTermCodeClient('');
    // setSearchTermNumeroSAP('');
    // setFilterStatus('');
  };

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdate = (updatedTicket: Partial<Ticket>) => {
    // Update the selected ticket state if it's the one being edited
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      setSelectedTicket(prev => ({ ...prev!, ...updatedTicket }));
    }
    // Note: This only updates the details view. The list might need a refresh
    // or more complex state management if immediate reflection is needed there.
    // For now, we rely on the list potentially re-fetching or being updated
    // when the sector changes or on a manual refresh.
  };

  const handleCloseDetails = () => {
    setSelectedTicket(null);
  };

  // Define available statuses for the filter dropdown
  const availableStatuses = ['en cours', 'À clôturer', 'Terminée', 'Demande de RMA']; // Add other relevant statuses

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Left Column: Sector Selector, Filters, Ticket List */}
      {/* Ensure this column allows its content (the flex container) to stretch */}
      <div className="md:col-span-1 flex flex-col space-y-4">
        {/* Sector Selector */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-white"><FaFilter className="inline mr-2" />Secteur SAP</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedSector || ''}
            onChange={handleSectorChange}
            disabled={filteredSectors.length === 0}
          >
            <option value="" disabled>-- Sélectionner un secteur --</option>
            {filteredSectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.id}</option>
            ))}
          </select>
        </div>

        {/* Filters - Only show if a sector is selected */}
        {selectedSector && (
          <div className="p-4 border rounded-lg shadow-sm bg-base-200 space-y-3 w-full"> {/* Added w-full here too for consistency */}
            <h3 className="text-lg font-semibold mb-2 text-white"><FaSearch className="inline mr-2" />Filtrer les Tickets</h3>
            {/* Search by Raison Sociale */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white"><FaBuilding className="inline mr-1" /> Raison Sociale</span>
              </label>
              <input
                type="text"
                placeholder="Rechercher..."
                className="input input-bordered input-sm w-full"
                value={searchTermRaisonSociale}
                onChange={(e) => setSearchTermRaisonSociale(e.target.value)}
              />
            </div>
            {/* Search by Code Client */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white"><FaHashtag className="inline mr-1" /> Code Client</span>
              </label>
              <input
                type="text"
                placeholder="Rechercher..."
                className="input input-bordered input-sm w-full"
                value={searchTermCodeClient}
                onChange={(e) => setSearchTermCodeClient(e.target.value)}
              />
            </div>
            {/* Search by Numero SAP */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white"><FaFileAlt className="inline mr-1" /> Numéro SAP</span>
              </label>
              <input
                type="text"
                placeholder="Rechercher..."
                className="input input-bordered input-sm w-full"
                value={searchTermNumeroSAP}
                onChange={(e) => setSearchTermNumeroSAP(e.target.value)}
              />
            </div>
            {/* Filter by Status */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-white"><FaInfoCircle className="inline mr-1" /> Statut</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ticket List Container */}
        {/* flex-grow should make this div take remaining vertical space */}
        {/* overflow-y-auto handles scrolling if content exceeds height */}
        {/* Added w-full to ensure it takes the full width of the column */}
        <div className="flex-grow overflow-y-auto h-[calc(100vh-250px)] w-full"> {/* Adjust height as needed */}
          <TicketList
            selectedSector={selectedSector}
            onTicketSelect={handleTicketSelect}
            // Pass filter props
            searchTermRaisonSociale={searchTermRaisonSociale}
            searchTermCodeClient={searchTermCodeClient}
            searchTermNumeroSAP={searchTermNumeroSAP}
            filterStatus={filterStatus}
          />
        </div>
      </div>

      {/* Right Column: Ticket Details */}
      <div className="md:col-span-2">
        {selectedTicket ? (
          <TicketDetails
            ticket={selectedTicket}
            sectorId={selectedSector!} // Non-null assertion as ticket is selected
            onClose={handleCloseDetails}
            onUpdate={handleTicketUpdate} // Pass the update handler
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Sélectionnez un ticket pour voir les détails.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SAPPage;
