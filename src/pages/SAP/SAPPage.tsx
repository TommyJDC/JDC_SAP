import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchSectors, listenToTicketsBySector } from '../../services/firebaseService';
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { FaFilter, FaTimes } from 'react-icons/fa';

interface Ticket {
  id: string;
  secteur: string;
  raisonSociale?: string;
  codeClient?: string;
  numeroSAP?: string;
  statut?: string;
  [key: string]: any;
}

interface Sector {
  id: string;
}

const SAPPage: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0); // State to trigger re-renders/refreshes

  const [searchTermRaisonSociale, setSearchTermRaisonSociale] = useState('');
  const [searchTermCodeClient, setSearchTermCodeClient] = useState('');
  const [searchTermNumeroSAP, setSearchTermNumeroSAP] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch sectors on component mount
  useEffect(() => {
    const loadSectors = async () => {
      try {
        setLoading(true);
        const sectorsData = await fetchSectors();
        setSectors(sectorsData);
        if (sectorsData.length > 0 && !selectedSector) {
          setSelectedSector(sectorsData[0].id);
        } else if (sectorsData.length === 0) {
           setLoading(false); // Stop loading if no sectors found
        }
      } catch (err) {
        console.error("Error loading sectors:", err);
        setError('Erreur lors du chargement des secteurs.');
        setLoading(false); // Stop loading on error
      }
      // Loading state will be managed by the ticket listener effect
    };
    loadSectors();
  }, []); // Run only once

  // Listen to tickets when selectedSector or dataVersion changes
  useEffect(() => {
    if (!selectedSector) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    // Keep selectedTicket, don't deselect when refreshing data
    // setSelectedTicket(null); // Removed this line

    console.log(`Subscribing to sector: ${selectedSector}, version: ${dataVersion}`);
    const unsubscribe = listenToTicketsBySector(selectedSector, (updatedTickets) => {
      console.log(`Received ${updatedTickets.length} tickets for sector ${selectedSector}`);
      setTickets(updatedTickets);
      setLoading(false);
      setError(null);
    }, (err) => { // Add error handling for the listener
        console.error(`Error listening to tickets for sector ${selectedSector}:`, err);
        setError(`Erreur de chargement des tickets pour ${selectedSector}.`);
        setTickets([]);
        setLoading(false);
    });

    return () => {
      console.log(`Unsubscribing from sector: ${selectedSector}`);
      unsubscribe();
    };

  }, [selectedSector, dataVersion]); // Re-run when selectedSector or dataVersion changes

  // Callback to refresh data when ticket details are updated
  const handleTicketUpdated = useCallback(() => {
    console.log("Ticket updated, incrementing data version.");
    setDataVersion(prevVersion => prevVersion + 1);
    // Optionally, could re-fetch the specific updated ticket if needed
    // For now, just refreshing the whole list listener
  }, []);


  const handleSelectTicket = useCallback((ticket: Ticket) => {
    console.log("Selected ticket:", ticket.id);
    setSelectedTicket(ticket);
  }, []);

  const handleCloseDetails = useCallback(() => {
    console.log("Closing details");
    setSelectedTicket(null);
  }, []);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSector = event.target.value;
    console.log("Sector changed to:", newSector);
    setSelectedSector(newSector);
    // Reset filters and selection when changing sector
    setSearchTermRaisonSociale('');
    setSearchTermCodeClient('');
    setSearchTermNumeroSAP('');
    setFilterStatut('');
    setSelectedTicket(null); // Deselect ticket when changing sector
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket =>
      (searchTermRaisonSociale === '' || ticket.raisonSociale?.toLowerCase().includes(searchTermRaisonSociale.toLowerCase())) &&
      (searchTermCodeClient === '' || ticket.codeClient?.toLowerCase().includes(searchTermCodeClient.toLowerCase())) &&
      (searchTermNumeroSAP === '' || ticket.numeroSAP?.toLowerCase().includes(searchTermNumeroSAP.toLowerCase())) &&
      (filterStatut === '' || ticket.statut === filterStatut)
    );
  }, [tickets, searchTermRaisonSociale, searchTermCodeClient, searchTermNumeroSAP, filterStatut]);

  const groupedTickets = useMemo(() => {
    return filteredTickets.reduce((acc, ticket) => {
      const clientKey = ticket.raisonSociale || 'Client inconnu';
      if (!acc[clientKey]) {
        acc[clientKey] = [];
      }
      acc[clientKey].push(ticket);
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [filteredTickets]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(tickets.map(ticket => ticket.statut).filter(Boolean));
    return ['', ...Array.from(statuses)];
  }, [tickets]);

  const clearFilters = () => {
    setSearchTermRaisonSociale('');
    setSearchTermCodeClient('');
    setSearchTermNumeroSAP('');
    setFilterStatut('');
  };

  const filtersActive = searchTermRaisonSociale || searchTermCodeClient || searchTermNumeroSAP || filterStatut;


  return (
    // Main container for the page, TicketDetails will be rendered outside this if selected
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]"> {/* Adjusted height */}
        {/* Left Panel: Sector Selector, Filters, and Ticket List */}
        {/* This panel is always visible on large screens, hides on small when details are open (handled by modal now) */}
         <div className="flex flex-col w-full lg:w-1/3"> {/* Ensure this flex-col container works correctly */}
          {/* Sector Selector */}
          <div className="mb-4 card bg-base-100 shadow p-4 shrink-0">
            <label htmlFor="sector-select" className="label font-semibold">Secteur SAP</label>
            <select
              id="sector-select"
              className="select select-bordered w-full"
              value={selectedSector || ''}
              onChange={handleSectorChange}
              disabled={loading && !selectedSector && sectors.length === 0} // Disable only during initial sector load
            >
              <option value="" disabled>Sélectionner un secteur...</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.id}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Controls */}
          <div className="mb-4 card bg-base-100 shadow p-4 shrink-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Filtres</h2>
              <div className="flex items-center gap-2">
                 <button
                    className={`btn btn-ghost btn-sm text-error ${!filtersActive ? 'hidden' : ''}`}
                    onClick={clearFilters}
                    title="Effacer les filtres"
                    >
                    <FaTimes /> Effacer
                </button>
                <button
                  className="btn btn-ghost btn-sm lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FaFilter /> {showFilters ? 'Masquer' : 'Afficher'}
                </button>
              </div>

            </div>
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-2`}>
              <input
                type="text"
                placeholder="Filtrer par Raison Sociale..."
                className="input input-bordered w-full"
                value={searchTermRaisonSociale}
                onChange={(e) => setSearchTermRaisonSociale(e.target.value)}
              />
              <input
                type="text"
                placeholder="Filtrer par Code Client..."
                className="input input-bordered w-full"
                value={searchTermCodeClient}
                onChange={(e) => setSearchTermCodeClient(e.target.value)}
              />
              <input
                type="text"
                placeholder="Filtrer par N° SAP..."
                className="input input-bordered w-full"
                value={searchTermNumeroSAP}
                onChange={(e) => setSearchTermNumeroSAP(e.target.value)}
              />
              <select
                className="select select-bordered w-full"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === '' ? 'Tous les statuts' : status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket List Area */}
          {/* Added min-h-0 to help flexbox calculate height for overflow */}
          <div className="flex-grow overflow-y-auto card bg-base-100 shadow p-4 w-full min-h-0">
            {loading && <div className="flex justify-center items-center h-full"><span className="loading loading-spinner loading-lg"></span></div>}
            {error && <div className="alert alert-error text-sm p-2"><span>{error}</span></div>}
            {!loading && !error && selectedSector && (
              <TicketList
                groupedTickets={groupedTickets}
                onSelectTicket={handleSelectTicket}
                selectedTicketId={selectedTicket?.id}
                groupByField="raisonSociale"
              />
            )}
            {!loading && !error && !selectedSector && (
              <p className="text-center text-gray-500">Veuillez sélectionner un secteur pour voir les tickets.</p>
            )}
             {!loading && !error && selectedSector && Object.keys(groupedTickets).length === 0 && (
               <p className="text-center text-gray-500">Aucun ticket trouvé pour les filtres actuels.</p>
             )}
          </div>
        </div>

        {/* Right Panel: Placeholder ONLY */}
        {/* This panel is always visible on large screens, hides on small when details are open (handled by modal now) */}
        <div className="w-full lg:w-2/3 hidden lg:flex justify-center items-center h-full text-gray-500 card bg-base-100 shadow p-4">
           Sélectionnez un ticket pour voir les détails.
        </div>
      </div>

      {/* Render TicketDetails as a Modal OUTSIDE the main layout */}
      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={handleCloseDetails}
          sectorId={selectedSector!} // Assert non-null as ticket is selected
          onTicketUpdated={handleTicketUpdated} // Pass the callback
        />
      )}
    </>
  );
};

export default SAPPage;
