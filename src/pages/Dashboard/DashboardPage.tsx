import React, { useState, useEffect, useRef } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import {
  listenToEnvoisCount,
  fetchSectors, // Keep fetchSectors
  listenToTicketsBySector, // Use this for tickets
  listenToCollection // Keep for envois data if needed elsewhere, but not for map now
} from '../../services/firebaseService';
import { Unsubscribe } from 'firebase/firestore';

// Define Envoi type (still needed for count tile)
interface Envoi {
  id: string;
  adresse?: string;
  [key: string]: any;
}

// Define Ticket type for the map - Use 'adresse' (lowercase)
interface Ticket {
  id: string;
  adresse?: string; // *** Field for map address (lowercase) ***
  raisonSociale?: string; // Client name for popup
  statut?: string; // Status for popup
  secteur?: string; // Sector info
  // Add other relevant Ticket fields if needed
  [key: string]: any;
}

const DashboardPage: React.FC = () => {
  const [envoisCount, setEnvoisCount] = useState<number>(0);
  const [ticketsCount, setTicketsCount] = useState<number>(0); // Still needed for tile
  const [ticketsData, setTicketsData] = useState<Ticket[]>([]); // State for Ticket documents for the map
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [loadingMapData, setLoadingMapData] = useState<boolean>(true);
  const [errorCounts, setErrorCounts] = useState<string | null>(null);
  const [errorMapData, setErrorMapData] = useState<string | null>(null);

  // Ref to store ticket listeners unsubscribe functions
  const ticketListenersRef = useRef<Unsubscribe[]>([]);
  // Ref to store combined tickets from all sectors temporarily
  const allTicketsRef = useRef<Record<string, Ticket[]>>({}); // Store tickets per sector { sectorId: tickets[] }

  useEffect(() => {
    setLoadingCounts(true);
    setLoadingMapData(true);
    setErrorCounts(null);
    setErrorMapData(null);
    allTicketsRef.current = {}; // Reset temporary storage on effect run

    let isMounted = true; // Flag to prevent state updates on unmounted component

    // --- Listener for Envois count (for the tile) ---
    const unsubscribeEnvoisCount = listenToEnvoisCount((count) => {
      if (isMounted) {
        setEnvoisCount(count);
        // Don't set loadingCounts false here, wait for tickets count fetch
      }
    });

    // --- Fetch Sectors and Set Up Ticket Listeners (for map and total count) ---
    const setupTicketListeners = async () => {
      try {
        console.log("[DashboardPage] Fetching sectors...");
        const sectors = await fetchSectors();
        if (!isMounted) return; // Check mount status after async operation
        console.log(`[DashboardPage] Fetched ${sectors.length} sectors. Setting up listeners...`);

        let initialTotalTickets = 0;
        const listeners: Unsubscribe[] = [];
        allTicketsRef.current = {}; // Initialize/clear ticket storage

        if (sectors.length === 0) {
            console.warn("[DashboardPage] No sectors found. Map data will likely be empty.");
            setLoadingMapData(false); // Stop loading if no sectors
        }

        sectors.forEach(sector => {
          const sectorId = sector.id;
          allTicketsRef.current[sectorId] = []; // Initialize array for sector
          console.log(`[DashboardPage] Setting up listener for sector: ${sectorId}`);

          const unsubscribe = listenToTicketsBySector(sectorId, (sectorTickets) => {
            if (isMounted) {
              console.log(`[DashboardPage] Received ${sectorTickets.length} tickets for sector: ${sectorId}`);
              // Store tickets for this sector
              allTicketsRef.current[sectorId] = sectorTickets as Ticket[]; // Assume fetched data matches Ticket interface

              // Combine tickets from all sectors
              let combinedTickets: Ticket[] = [];
              let currentTotalTickets = 0;
              Object.values(allTicketsRef.current).forEach(tickets => {
                combinedTickets = combinedTickets.concat(tickets);
                currentTotalTickets += tickets.length;
              });

              // *** Log combined tickets before setting state (keep for debugging if needed) ***
              // console.log(`[DashboardPage] Combined tickets from all sectors before setting state (Total: ${currentTotalTickets}):`, JSON.stringify(combinedTickets, null, 2));

              console.log(`[DashboardPage] Updating state. Total tickets: ${currentTotalTickets}, Combined tickets for map:`, combinedTickets.length); // Log length instead of full object
              // Update state
              setTicketsData(combinedTickets); // Update map data
              setTicketsCount(currentTotalTickets); // Update total count tile

              // Consider map loading finished when first batch of tickets arrive (even if empty)
              if (loadingMapData) {
                  console.log("[DashboardPage] Setting loadingMapData to false.");
                  setLoadingMapData(false);
              }
              setErrorMapData(null); // Clear error if data arrives
            } else {
               console.log(`[DashboardPage] Listener update for sector ${sectorId} ignored (component unmounted).`);
            }
          }, (error) => { // Add error handler for listener
             console.error(`[DashboardPage] Error listening to tickets for sector ${sectorId}:`, error);
             if(isMounted) {
                setErrorMapData(prev => prev ? `${prev}, Erreur secteur ${sectorId}` : `Erreur secteur ${sectorId}`);
                // Maybe remove tickets for this sector if listener fails?
                // allTicketsRef.current[sectorId] = [];
                // // Re-combine and update state
                // let combinedTickets: Ticket[] = [];
                // let currentTotalTickets = 0;
                // Object.values(allTicketsRef.current).forEach(tickets => {
                //   combinedTickets = combinedTickets.concat(tickets);
                //   currentTotalTickets += tickets.length;
                // });
                // setTicketsData(combinedTickets);
                // setTicketsCount(currentTotalTickets);
             }
          });
          listeners.push(unsubscribe);
        });

        ticketListenersRef.current = listeners; // Store unsubscribe functions

        // Set loading counts false after listeners are set up
        setLoadingCounts(false);

      } catch (err) {
        console.error("[DashboardPage] Error fetching sectors or setting up ticket listeners:", err);
        if (isMounted) {
          setErrorCounts('Erreur chargement secteurs/tickets.');
          setErrorMapData('Erreur chargement données carte.');
          setLoadingCounts(false);
          setLoadingMapData(false);
        }
      }
    };

    setupTicketListeners();

    // --- Cleanup listeners on unmount ---
    return () => {
      isMounted = false;
      unsubscribeEnvoisCount();
      // Unsubscribe from all ticket listeners
      console.log(`[DashboardPage] Cleaning up ${ticketListenersRef.current.length} ticket listeners.`);
      ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
      ticketListenersRef.current = []; // Clear the array
      console.log('[DashboardPage] Dashboard listeners cleaned up.');
    };
  }, []); // Run only once on mount

  console.log("[DashboardPage] Rendering. LoadingMapData:", loadingMapData, "ErrorMapData:", errorMapData, "TicketsData length:", ticketsData.length);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Tableau de Bord</h1>

      {/* Dashboard Tiles */}
      <DashboardTiles
        envoisCount={envoisCount}
        ticketsCount={ticketsCount} // Pass the real-time total tickets count
        loading={loadingCounts}
        error={errorCounts}
      />

      {/* Interactive Map - Now uses ticketsData */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Carte Interactive des Tickets SAP</h2>
          {loadingMapData && <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span><p className="ml-2">Chargement des données de la carte...</p></div>}
          {errorMapData && <div className="text-error text-center p-4">Erreur lors du chargement des données de la carte: {errorMapData}</div>}
          {!loadingMapData && !errorMapData && (
            // Pass ticketsData to the map component
            <InteractiveMap tickets={ticketsData} />
          )}
           {/* Add message if no tickets */}
           {!loadingMapData && !errorMapData && ticketsData.length === 0 && (
             <div className="text-center p-4 text-gray-500">Aucun ticket avec une adresse à afficher sur la carte.</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
