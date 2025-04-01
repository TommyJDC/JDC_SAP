import React, { useState, useEffect, useRef } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import {
  listenToEnvoisCount,
  fetchSectors,
  listenToTicketsBySector,
  // listenToCollection // Not currently used here, but keep if needed elsewhere
} from '../../services/firebaseService';
import { Unsubscribe } from 'firebase/firestore';
// import L from 'leaflet'; // Leaflet types are implicitly handled via InteractiveMap

interface Envoi {
  id: string;
  adresse?: string;
  [key: string]: any;
}

interface Ticket {
  id: string;
  adresse?: string;
  raisonSociale?: string;
  statut?: string;
  secteur?: string; // Assuming sector ID is stored here
  [key: string]: any;
}

const DashboardPage: React.FC = () => {
  const [envoisCount, setEnvoisCount] = useState<number>(0);
  const [ticketsCount, setTicketsCount] = useState<number>(0);
  const [ticketsData, setTicketsData] = useState<Ticket[]>([]);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [loadingMapData, setLoadingMapData] = useState<boolean>(true); // Tracks loading of ticket data for the map
  const [errorCounts, setErrorCounts] = useState<string | null>(null);
  const [errorMapData, setErrorMapData] = useState<string | null>(null); // Tracks errors fetching ticket data

  const ticketListenersRef = useRef<Unsubscribe[]>([]);
  // Use a ref to store tickets per sector to correctly aggregate them
  const allTicketsRef = useRef<Record<string, Ticket[]>>({});

  useEffect(() => {
    setLoadingCounts(true);
    setLoadingMapData(true);
    setErrorCounts(null);
    setErrorMapData(null);
    allTicketsRef.current = {}; // Reset ticket data on mount/re-run

    let isMounted = true; // Flag to prevent state updates after unmount

    // Listener for Envois count
    const unsubscribeEnvoisCount = listenToEnvoisCount((count) => {
      if (isMounted) {
        setEnvoisCount(count);
        // Assuming counts load relatively quickly or together
        if (loadingCounts) setLoadingCounts(false);
      }
    }, (error) => {
        console.error("[DashboardPage] Error listening to envois count:", error);
        if (isMounted) {
            setErrorCounts("Erreur chargement nb envois");
            setLoadingCounts(false);
        }
    });

    // Setup listeners for tickets based on sectors
    const setupTicketListeners = async () => {
      try {
        console.log("[DashboardPage] Fetching sectors...");
        const sectors = await fetchSectors(); // Fetch all available sectors
        if (!isMounted) return; // Check if component is still mounted after async operation
        console.log(`[DashboardPage] Fetched ${sectors.length} sectors. Setting up listeners...`);

        // Reset listeners and ticket data store
        ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
        ticketListenersRef.current = [];
        allTicketsRef.current = {};

        if (sectors.length === 0) {
            console.warn("[DashboardPage] No sectors found. Map data will likely be empty.");
            if (isMounted) {
                setTicketsData([]); // Ensure data is empty
                setTicketsCount(0);
                setLoadingMapData(false); // Stop loading indicator
            }
            return; // No need to set up listeners
        }

        // Set up a listener for each sector
        sectors.forEach(sector => {
          const sectorId = sector.id; // Assuming sector object has an 'id'
          allTicketsRef.current[sectorId] = []; // Initialize empty array for this sector
          console.log(`[DashboardPage] Setting up listener for sector: ${sectorId}`);

          const unsubscribe = listenToTicketsBySector(sectorId, (sectorTickets) => {
            if (isMounted) {
              console.log(`[DashboardPage] Received ${sectorTickets.length} tickets for sector: ${sectorId}`);
              allTicketsRef.current[sectorId] = sectorTickets as Ticket[]; // Update the specific sector's tickets

              // Combine tickets from all sectors
              let combinedTickets: Ticket[] = [];
              let currentTotalTickets = 0;
              Object.values(allTicketsRef.current).forEach(tickets => {
                combinedTickets = combinedTickets.concat(tickets);
                currentTotalTickets += tickets.length;
              });

              console.log(`[DashboardPage] Updating state. Total tickets: ${currentTotalTickets}, Combined tickets for map:`, combinedTickets.length);
              setTicketsData(combinedTickets); // Update state with all tickets for the map
              setTicketsCount(currentTotalTickets); // Update total ticket count

              // Consider map data loaded once the first batch of tickets arrives (or all listeners are set up)
              // A more robust approach might wait for all initial loads, but this is simpler.
              if (loadingMapData) {
                  console.log("[DashboardPage] Setting loadingMapData to false.");
                  setLoadingMapData(false);
              }
              setErrorMapData(null); // Clear previous errors on successful update
            } else {
               console.log(`[DashboardPage] Listener update for sector ${sectorId} ignored (component unmounted).`);
            }
          }, (error) => {
             console.error(`[DashboardPage] Error listening to tickets for sector ${sectorId}:`, error);
             if(isMounted) {
                // Append error message, don't overwrite previous ones
                setErrorMapData(prev => prev ? `${prev}, Erreur secteur ${sectorId}` : `Erreur chargement tickets secteur ${sectorId}`);
                // Optionally stop loading if a critical error occurs
                // setLoadingMapData(false);
             }
          });
          ticketListenersRef.current.push(unsubscribe); // Store the unsubscribe function
        });

        // Initial loading state updates (counts might finish before tickets)
        if (isMounted && loadingCounts) setLoadingCounts(false);


      } catch (err) {
        console.error("[DashboardPage] Error fetching sectors or setting up ticket listeners:", err);
        if (isMounted) {
          setErrorCounts('Erreur chargement secteurs');
          setErrorMapData('Erreur chargement données carte.');
          setLoadingCounts(false);
          setLoadingMapData(false);
        }
      }
    };

    setupTicketListeners();

    // Cleanup function
    return () => {
      isMounted = false; // Set flag to false when component unmounts
      console.log('[DashboardPage] Cleaning up listeners...');
      unsubscribeEnvoisCount(); // Unsubscribe from envois count
      console.log(`[DashboardPage] Cleaning up ${ticketListenersRef.current.length} ticket listeners.`);
      ticketListenersRef.current.forEach(unsubscribe => unsubscribe()); // Unsubscribe from all ticket listeners
      ticketListenersRef.current = []; // Clear the array
      console.log('[DashboardPage] Dashboard listeners cleaned up.');
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  console.log("[DashboardPage] Rendering. LoadingMapData:", loadingMapData, "ErrorMapData:", errorMapData, "TicketsData length:", ticketsData.length);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Tableau de Bord</h1>

      <DashboardTiles
        envoisCount={envoisCount}
        ticketsCount={ticketsCount}
        loading={loadingCounts}
        error={errorCounts}
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Carte Interactive des Tickets SAP et Secteurs</h2> {/* Updated Title */}
          {/* Display loading indicator while fetching ticket data */}
          {loadingMapData && (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="ml-2">Chargement des données de la carte...</p>
            </div>
          )}
          {/* Display error message if fetching ticket data failed */}
          {errorMapData && !loadingMapData && (
            <div className="text-error text-center p-4">
              Erreur lors du chargement des données de la carte: {errorMapData}
            </div>
          )}
          {/* Render the map only when not loading and no errors occurred */}
          {!loadingMapData && !errorMapData && (
            <InteractiveMap tickets={ticketsData} />
          )}
           {/* Optional: Message when data is loaded but no tickets have addresses */}
           {!loadingMapData && !errorMapData && ticketsData.length === 0 && (
             <div className="text-center p-4 text-gray-500">Aucun ticket avec une adresse valide à afficher sur la carte pour le moment.</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
