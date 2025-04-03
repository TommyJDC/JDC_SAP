import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchSectors, listenToTicketsBySector, fetchTicketsBySector } from '../../services/firebaseService'; // Import fetchTicketsBySector
import TicketList from '../../components/Tickets/TicketList';
import TicketDetails from '../../components/Tickets/TicketDetails';
import { FaFilter, FaTimes, FaUserTie, FaRedo } from 'react-icons/fa'; // Added FaUserTie and FaRedo
import useGeoCoding from '../../hooks/useGeoCoding'; // Import useGeoCoding
import { kmlZones } from '../../utils/kmlZones'; // Import KML zones
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';

interface Ticket {
  id: string;
  secteur: string;
  raisonSociale?: string;
  codeClient?: string;
  numeroSAP?: string;
  statut?: string;
  adresse?: string; // Ensure adresse is part of the type
  salesperson?: string; // Add salesperson field
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
  const [dataVersion, setDataVersion] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true); // Loading state for tickets list


  const [searchTermRaisonSociale, setSearchTermRaisonSociale] = useState('');
  const [searchTermCodeClient, setSearchTermCodeClient] = useState('');
  const [searchTermNumeroSAP, setSearchTermNumeroSAP] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // --- Geocoding Logic ---
  const validTicketsForGeo = useMemo(() => {
    return tickets.filter(ticket =>
        typeof ticket.adresse === 'string' &&
        ticket.adresse.trim() !== '' &&
        ticket.adresse !== "Non trouvé"
    );
  }, [tickets]);

  const addressesToGeocode = useMemo(() => {
    return validTicketsForGeo.map(ticket => ticket.adresse as string);
  }, [validTicketsForGeo]);

  const { coordinates: fetchedCoordinates, isLoading: geocodingIsLoading, error: geocodingError } = useGeoCoding(addressesToGeocode);
  // --- End Geocoding Logic ---

  // --- Fetching Tickets Data ---
  const loadTickets = useCallback(async (sector: string) => {
    if (!sector) return; // Exit if no sector selected
    setLoadingTickets(true);
    setError(null);
    try {
      const fetchedTickets = await fetchTicketsBySector(sector);
      setTickets(fetchedTickets);
      setError(null);
    } catch (err) {
      console.error(`Error loading tickets for sector ${sector}:`, err);
      setError(`Erreur de chargement des tickets pour ${sector}.`);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);


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
           setLoading(false);
        }
      } catch (err) {
        console.error("Error loading sectors:", err);
        setError('Erreur lors du chargement des secteurs.');
        setLoading(false);
      }
    };
    loadSectors();
  }, []);

  // Listen to tickets when selectedSector or dataVersion changes (REALTIME updates)
  useEffect(() => {
    if (!selectedSector) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`Subscribing to sector: ${selectedSector}, version: ${dataVersion}`);
    const unsubscribe = listenToTicketsBySector(selectedSector, (updatedTickets) => {
      console.log(`Received ${updatedTickets.length} tickets for sector ${selectedSector}`);
      setTickets(updatedTickets); // Set raw tickets first
      setLoading(false);
      setError(null);
    }, (err) => {
        console.error(`Error listening to tickets for sector ${selectedSector}:`, err);
        setError(`Erreur de chargement des tickets pour ${selectedSector}.`);
        setTickets([]);
        setLoading(false);
    });

    return () => {
      console.log(`Unsubscribing from sector: ${selectedSector}`);
      unsubscribe();
    };

  }, [selectedSector, dataVersion]);

  // --- Salesperson Assignment Logic ---
  const ticketsWithSalesperson = useMemo(() => {
    if (geocodingIsLoading || !fetchedCoordinates || fetchedCoordinates.length !== validTicketsForGeo.length) {
      // Return original tickets if geocoding isn't ready or mismatch
      return tickets.map(t => ({ ...t, salesperson: 'Chargement...' }));
    }

    // Create a map for quick coordinate lookup
    const coordinateMap = new Map<string, { lat: number; lng: number }>();
    validTicketsForGeo.forEach((ticket, index) => {
      if (fetchedCoordinates[index]) {
        coordinateMap.set(ticket.id, fetchedCoordinates[index]);
      }
    });

    return tickets.map(ticket => {
      const coords = coordinateMap.get(ticket.id);
      let salesperson = 'Hors zone'; // Default if no zone found or no coords

      if (coords) {
        try {
          const point = turfPoint([coords.lng, coords.lat]); // GeoJSON order: lng, lat
          const zone = kmlZones.find(zoneData =>
            booleanPointInPolygon(point, zoneData.feature)
          );
          if (zone) {
            salesperson = zone.name;
          }
        } catch (e) {
            console.error(`Error checking point in polygon for ticket ${ticket.id}:`, e);
            salesperson = 'Erreur zone';
        }
      } else if (ticket.adresse && ticket.adresse !== "Non trouvé") {
          // If address exists but no coords yet (still loading maybe?)
          salesperson = 'Géocodage...';
      } else {
          // No address or "Non trouvé"
          salesperson = 'Adresse manquante';
      }


      return { ...ticket, salesperson };
    });
  }, [tickets, fetchedCoordinates, geocodingIsLoading, validTicketsForGeo]);
  // --- End Salesperson Assignment Logic ---


  const handleTicketUpdated = useCallback(() => {
    console.log("Ticket updated, incrementing data version.");
    setDataVersion(prevVersion => prevVersion + 1);
  }, []);


  const handleSelectTicket = useCallback((ticket: Ticket) => {
    console.log("Selected ticket:", ticket.id);
    // Find the potentially updated ticket data (with salesperson)
    const updatedTicket = ticketsWithSalesperson.find(t => t.id === ticket.id) || ticket;
    setSelectedTicket(updatedTicket);
  }, [ticketsWithSalesperson]); // Depend on ticketsWithSalesperson

  const handleCloseDetails = useCallback(() => {
    console.log("Closing details");
    setSelectedTicket(null);
  }, []);

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSector = event.target.value;
    console.log("Sector changed to:", newSector);
    setSelectedSector(newSector);
    loadTickets(newSector); // Load tickets for the newly selected sector
    setSearchTermRaisonSociale('');
    setSearchTermCodeClient('');
    setSearchTermNumeroSAP('');
    setFilterStatut('');
    setSelectedTicket(null);
  };

  const handleRefreshTicketsList = () => {
    if (selectedSector) {
      loadTickets(selectedSector);
    }
  };

  // Filter the tickets *after* salesperson assignment
  const filteredTickets = useMemo(() => {
    return ticketsWithSalesperson.filter(ticket =>
      (searchTermRaisonSociale === '' || ticket.raisonSociale?.toLowerCase().includes(searchTermRaisonSociale.toLowerCase())) &&
      (searchTermCodeClient === '' || ticket.codeClient?.toLowerCase().includes(searchTermCodeClient.toLowerCase())) &&
      (searchTermNumeroSAP === '' || ticket.numeroSAP?.toLowerCase().includes(searchTermNumeroSAP.toLowerCase())) &&
      (filterStatut === '' || ticket.statut === filterStatut)
    );
  }, [ticketsWithSalesperson, searchTermRaisonSociale, searchTermCodeClient, searchTermNumeroSAP, filterStatut]);

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
  }, [tickets]); // Base statuses on original tickets

  const clearFilters = () => {
    setSearchTermRaisonSociale('');
    setSearchTermCodeClient('');
    setSearchTermNumeroSAP('');
    setFilterStatut('');
  };

  const filtersActive = searchTermRaisonSociale || searchTermCodeClient || searchTermNumeroSAP || filterStatut;


  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
         <div className="flex flex-col w-full"> {/* Modified width to w-full */}
          {/* Sector Selector */}
          <div className="mb-4 card bg-base-100 shadow p-4 shrink-0">
            <label htmlFor="sector-select" className="label font-semibold">Secteur SAP</label>
            <select
              id="sector-select"
              className="select select-bordered w-full"
              value={selectedSector || ''}
              onChange={handleSectorChange}
              disabled={loading && !selectedSector && sectors.length === 0}
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
                  className="btn btn-ghost btn-sm"
                  onClick={handleRefreshTicketsList}
                  title="Rafraîchir la liste des tickets"
                >
                  <FaRedo />
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
             {/* Display geocoding errors */}
             {geocodingError && (
                <div className="mt-2 text-xs text-error">
                    Erreur géocodage: {geocodingError}
                </div>
             )}
          </div>

          {/* Ticket List Area */}
          <div className="scrollable-list flex-grow card bg-base-100 shadow p-4 w-full min-h-0" style={{ minHeight: 0, maxHeight: 'calc(100vh - 15rem)' }}>
            {(loading || (geocodingIsLoading && tickets.length > 0) || loadingTickets) && <div className="flex justify-center items-center h-full"><span className="loading loading-spinner loading-lg"></span></div>}
            {error && <div className="alert alert-error text-sm p-2"><span>{error}</span></div>}
            {!loading && !error && selectedSector && !loadingTickets && (
              <TicketList
                groupedTickets={groupedTickets} // Pass augmented and filtered tickets
                onSelectTicket={handleSelectTicket}
                selectedTicketId={selectedTicket?.id}
                groupByField="raisonSociale"
              />
            )}
            {!loading && !error && !selectedSector && !loadingTickets && (
              <p className="text-center text-gray-500">Veuillez sélectionner un secteur pour voir les tickets.</p>
            )}
             {!loading && !error && selectedSector && Object.keys(groupedTickets).length === 0 && !geocodingIsLoading && !loadingTickets && (
               <p className="text-center text-gray-500">Aucun ticket trouvé pour les filtres actuels.</p>
             )}
          </div>
        </div>

        {/* Right Panel: Placeholder REMOVED */}
        {/* Removed right panel div */}
      </div>

      {/* Render TicketDetails as a Modal OUTSIDE the main layout */}
      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket} // Pass ticket potentially with salesperson
          onClose={handleCloseDetails}
          sectorId={selectedSector!}
          onTicketUpdated={handleTicketUpdated}
        />
      )}
    </>
  );
};

export default SAPPage;
