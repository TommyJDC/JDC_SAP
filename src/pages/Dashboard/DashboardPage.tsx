import React, { useState, useEffect, useRef } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import {
  listenToEnvoisCount,
  fetchSectors,
  listenToTicketsBySector,
} from '../../services/firebaseService';
import { Unsubscribe } from 'firebase/firestore';

// Keep interfaces as they are data structures
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
  secteur?: string;
  [key: string]: any;
}

const DashboardPage: React.FC = () => {
  const [envoisCount, setEnvoisCount] = useState<number>(0);
  const [ticketsCount, setTicketsCount] = useState<number>(0);
  const [ticketsData, setTicketsData] = useState<Ticket[]>([]);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [loadingMapData, setLoadingMapData] = useState<boolean>(true);
  const [errorCounts, setErrorCounts] = useState<string | null>(null);
  const [errorMapData, setErrorMapData] = useState<string | null>(null);

  const ticketListenersRef = useRef<Unsubscribe[]>([]);
  const allTicketsRef = useRef<Record<string, Ticket[]>>({});

  useEffect(() => {
    setLoadingCounts(true);
    setLoadingMapData(true);
    setErrorCounts(null);
    setErrorMapData(null);
    allTicketsRef.current = {};

    let isMounted = true;

    const unsubscribeEnvoisCount = listenToEnvoisCount((count) => {
      if (isMounted) {
        setEnvoisCount(count);
        if (loadingCounts) setLoadingCounts(false); // Consider counts loaded here
      }
    }, (error) => {
        console.error("[DashboardPage] Error listening to envois count:", error);
        if (isMounted) {
            setErrorCounts("Erreur chargement nb envois");
            setLoadingCounts(false);
        }
    });

    const setupTicketListeners = async () => {
      try {
        const sectors = await fetchSectors();
        if (!isMounted) return;

        ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
        ticketListenersRef.current = [];
        allTicketsRef.current = {};

        if (sectors.length === 0) {
            if (isMounted) {
                setTicketsData([]);
                setTicketsCount(0);
                setLoadingMapData(false);
            }
            return;
        }

        sectors.forEach(sector => {
          const sectorId = sector.id;
          allTicketsRef.current[sectorId] = [];

          const unsubscribe = listenToTicketsBySector(sectorId, (sectorTickets) => {
            if (isMounted) {
              allTicketsRef.current[sectorId] = sectorTickets as Ticket[];

              let combinedTickets: Ticket[] = [];
              let currentTotalTickets = 0;
              Object.values(allTicketsRef.current).forEach(tickets => {
                combinedTickets = combinedTickets.concat(tickets);
                currentTotalTickets += tickets.length;
              });

              setTicketsData(combinedTickets);
              setTicketsCount(currentTotalTickets);

              // Update loading/error states for map data
              if (loadingMapData) setLoadingMapData(false);
              setErrorMapData(null);
            }
          }, (error) => {
             console.error(`[DashboardPage] Error listening to tickets for sector ${sectorId}:`, error);
             if(isMounted) {
                setErrorMapData(prev => prev ? `${prev}, Erreur secteur ${sectorId}` : `Erreur chargement tickets secteur ${sectorId}`);
                // Decide if map loading should stop on partial error
                // setLoadingMapData(false);
             }
          });
          ticketListenersRef.current.push(unsubscribe);
        });

        // If counts haven't finished loading yet, mark them as loaded now if setup is done
        if (isMounted && loadingCounts) setLoadingCounts(false);

      } catch (err) {
        console.error("[DashboardPage] Error fetching sectors or setting up ticket listeners:", err);
        if (isMounted) {
          const errorMsg = 'Erreur chargement données';
          setErrorCounts(errorMsg);
          setErrorMapData(errorMsg);
          setLoadingCounts(false);
          setLoadingMapData(false);
        }
      }
    };

    setupTicketListeners();

    return () => {
      isMounted = false;
      unsubscribeEnvoisCount();
      ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
      ticketListenersRef.current = [];
    };
  }, []);

  // TODO: Implement advanced sector-based statistics display here or in DashboardTiles
  // For now, DashboardTiles only shows total counts.

  return (
    <div className="space-y-6">
      {/* Page Title - Using JDC styles */}
      <h1 className="text-3xl font-bold text-jdc-white mb-4">Tableau de Bord</h1>

      {/* Dashboard Tiles - Needs update if showing sector stats */}
      <DashboardTiles
        envoisCount={envoisCount}
        ticketsCount={ticketsCount}
        loading={loadingCounts}
        error={errorCounts}
        // Pass sector data here when implemented
      />

      {/* Interactive Map Card - Using JDC styles */}
      <div className="card bg-jdc-dark-gray shadow-lg border border-base-300"> {/* Updated card style */}
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title text-xl font-semibold text-jdc-white mb-4">
            Carte Interactive des Tickets SAP
          </h2>
          {loadingMapData && (
            <div className="flex justify-center items-center h-64 text-jdc-light-gray">
              <span className="loading loading-spinner loading-lg text-jdc-yellow mr-2"></span>
              Chargement de la carte...
            </div>
          )}
          {errorMapData && !loadingMapData && (
            <div className="text-red-500 text-center p-4">
              Erreur chargement carte: {errorMapData}
            </div>
          )}
          {!loadingMapData && !errorMapData && (
             // Ensure map container has a defined height
            <div className="h-[400px] md:h-[500px] lg:h-[600px] w-full rounded overflow-hidden">
                 <InteractiveMap tickets={ticketsData} />
            </div>
          )}
          {!loadingMapData && !errorMapData && ticketsData.length === 0 && (
             <div className="text-center p-4 text-jdc-light-gray">Aucun ticket à afficher sur la carte.</div>
           )}
        </div>
      </div>

      {/* Placeholder for Advanced Sector Statistics */}
      <div className="card bg-jdc-dark-gray shadow-lg border border-base-300">
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title text-xl font-semibold text-jdc-white mb-4">
            Statistiques par Secteur (Bientôt disponible)
          </h2>
          <p className="text-jdc-light-gray">
            Des statistiques détaillées par secteur pour les tickets SAP et les envois seront ajoutées ici.
            {/* Example: Display counts per sector if data is available */}
            {/* {Object.entries(allTicketsRef.current).map(([sectorId, tickets]) => (
              <div key={sectorId}>Secteur {sectorId}: {tickets.length} tickets</div>
            ))} */}
          </p>
           {/* Loading/Error state for sector stats can be added here */}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
