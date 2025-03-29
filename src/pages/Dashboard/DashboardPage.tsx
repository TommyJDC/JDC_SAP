import React, { useState, useEffect, useRef } from 'react';
import DashboardTiles from '../../components/Dashboard/DashboardTiles';
import InteractiveMap from '../../components/Dashboard/InteractiveMap';
import {
  listenToEnvoisCount,
  fetchSectors,
  listenToTicketsBySector,
  listenToCollection
} from '../../services/firebaseService';
import { Unsubscribe } from 'firebase/firestore';
import L from 'leaflet'; // Import Leaflet here

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
      }
    });

    const setupTicketListeners = async () => {
      try {
        console.log("[DashboardPage] Fetching sectors...");
        const sectors = await fetchSectors();
        if (!isMounted) return;
        console.log(`[DashboardPage] Fetched ${sectors.length} sectors. Setting up listeners...`);

        let initialTotalTickets = 0;
        const listeners: Unsubscribe[] = [];
        allTicketsRef.current = {};

        if (sectors.length === 0) {
            console.warn("[DashboardPage] No sectors found. Map data will likely be empty.");
            setLoadingMapData(false);
        }

        sectors.forEach(sector => {
          const sectorId = sector.id;
          allTicketsRef.current[sectorId] = [];
          console.log(`[DashboardPage] Setting up listener for sector: ${sectorId}`);

          const unsubscribe = listenToTicketsBySector(sectorId, (sectorTickets) => {
            if (isMounted) {
              console.log(`[DashboardPage] Received ${sectorTickets.length} tickets for sector: ${sectorId}`);
              allTicketsRef.current[sectorId] = sectorTickets as Ticket[];

              let combinedTickets: Ticket[] = [];
              let currentTotalTickets = 0;
              Object.values(allTicketsRef.current).forEach(tickets => {
                combinedTickets = combinedTickets.concat(tickets);
                currentTotalTickets += tickets.length;
              });

              console.log(`[DashboardPage] Updating state. Total tickets: ${currentTotalTickets}, Combined tickets for map:`, combinedTickets.length);
              setTicketsData(combinedTickets);
              setTicketsCount(currentTotalTickets);

              if (loadingMapData) {
                  console.log("[DashboardPage] Setting loadingMapData to false.");
                  setLoadingMapData(false);
              }
              setErrorMapData(null);
            } else {
               console.log(`[DashboardPage] Listener update for sector ${sectorId} ignored (component unmounted).`);
            }
          }, (error) => {
             console.error(`[DashboardPage] Error listening to tickets for sector ${sectorId}:`, error);
             if(isMounted) {
                setErrorMapData(prev => prev ? `${prev}, Erreur secteur ${sectorId}` : `Erreur secteur ${sectorId}`);
             }
          });
          listeners.push(unsubscribe);
        });

        ticketListenersRef.current = listeners;

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

    return () => {
      isMounted = false;
      unsubscribeEnvoisCount();
      console.log(`[DashboardPage] Cleaning up ${ticketListenersRef.current.length} ticket listeners.`);
      ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
      ticketListenersRef.current = [];
      console.log('[DashboardPage] Dashboard listeners cleaned up.');
    };
  }, []);

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
          <h2 className="card-title">Carte Interactive des Tickets SAP</h2>
          {loadingMapData && <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span><p className="ml-2">Chargement des données de la carte...</p></div>}
          {errorMapData && <div className="text-error text-center p-4">Erreur lors du chargement des données de la carte: {errorMapData}</div>}
          {!loadingMapData && !errorMapData && (
            <InteractiveMap tickets={ticketsData} />
          )}
           {!loadingMapData && !errorMapData && ticketsData.length === 0 && (
             <div className="text-center p-4 text-gray-500">Aucun ticket avec une adresse à afficher sur la carte.</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
