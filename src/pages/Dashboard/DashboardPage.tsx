import React, { useState, useEffect, useRef } from 'react';
    import DashboardTiles from '../../components/Dashboard/DashboardTiles';
    import InteractiveMap from '../../components/Dashboard/InteractiveMap';
    import SectorStats from '../../components/Dashboard/SectorStats';
    import {
      listenToEnvoisCount,
      fetchSectors,
      listenToTicketsBySector,
      fetchCollection,
    } from '../../services/firebaseService';
    import { Unsubscribe } from 'firebase/firestore';

    interface Envoi {
      id: string;
      adresse?: string;
      typeLivraison?: string;
      nomClient?: string;
      [key: string]: any;
    }

    interface Ticket {
      id: string;
      adresse?: string;
      raisonSociale?: string;
      statut?: string;
      secteur?: string;
      demandeSAP?: string;
      [key: string]: any;
    }

    interface SectorData {
      sectorName: string;
      ticketCount: number;
    }

    const DashboardPage: React.FC = () => {
      const [envoisCount, setEnvoisCount] = useState<number>(0); // Keep for now, might be used later
      const [ticketsCount, setTicketsCount] = useState<number>(0);
      const [ticketsData, setTicketsData] = useState<Ticket[]>([]);
      const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
      const [loadingMapData, setLoadingMapData] = useState<boolean>(true);
      const [errorCounts, setErrorCounts] = useState<string | null>(null);
      const [errorMapData, setErrorMapData] = useState<string | null>(null);
      const [sectorStats, setSectorStats] = useState<SectorData[]>([]); // State for sector stats
      const [loadingSectorStats, setLoadingSectorStats] = useState<boolean>(true);
      const [errorSectorStats, setErrorSectorStats] = useState<string | null>(null);


      const [envoisCountYesterday, setEnvoisCountYesterday] = useState<number>(0); // Keep for now, might be used later
      const [ticketsCountYesterday, setTicketsCountYesterday] = useState<number>(0);
      const [rmaTicketsCount, setRmaTicketsCount] = useState<number>(0);
      const [rmaTicketsCountYesterday, setRmaTicketsCountYesterday] = useState<number>(0);
      const [clientCtnCount, setClientCtnCount] = useState<number>(0);
      const [clientCtnCountYesterday, setClientCtnCountYesterday] = useState<number>(0);
      const [newTicketsCount, setNewTicketsCount] = useState<number>(0);
      const [newTicketsCountYesterday, setNewTicketsCountYesterday] = useState<number>(0);


      const ticketListenersRef = useRef<Unsubscribe[]>([]);
      const allTicketsRef = useRef<Record<string, Ticket[]>>({});

      useEffect(() => {
        setLoadingCounts(true);
        setLoadingMapData(true);
        setLoadingSectorStats(true);
        setErrorCounts(null);
        setErrorMapData(null);
        setErrorSectorStats(null);
        allTicketsRef.current = {};

        let isMounted = true;

        const unsubscribeEnvoisCount = listenToEnvoisCount((count) => {
          if (isMounted) {
            setEnvoisCount(count);
          }
        }, (error) => {
          console.error("[DashboardPage] Error listening to envois count:", error);
          if (isMounted) {
            setErrorCounts("Erreur chargement nb envois");
          }
        });

        const fetchYesterdayCounts = async () => {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
          const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          const yesterdayStartISO = yesterdayStart.toISOString();
          const yesterdayEndISO = yesterdayEnd.toISOString();

          try {
            const allEnvois = await fetchCollection('Envoi') as Envoi[];
            console.log("[DashboardPage] Total envois fetched:", allEnvois.length); // Log total envois
            setEnvoisCountYesterday(allEnvois.filter(envoi =>
              envoi.dateCreation && envoi.dateCreation >= yesterdayStartISO && envoi.dateCreation <= yesterdayEndISO
            ).length);


            const ctnEnvois = allEnvois.filter(envoi => envoi.typeLivraison === 'CTN');
            console.log("[DashboardPage] CTN envois count:", ctnEnvois.length); // Log CTN envois count
            const yesterdayCtnEnvois = ctnEnvois.filter(envoi =>
              envoi.dateCreation && envoi.dateCreation >= yesterdayStartISO && envoi.dateCreation <= yesterdayEndISO
            );
            console.log("[DashboardPage] Yesterday CTN envois count:", yesterdayCtnEnvois.length); // Log yesterday CTN envois count
            const yesterdayClientCtnCount = [...new Set(yesterdayCtnEnvois.map(envoi => envoi.nomClient))].length;
            console.log("[DashboardPage] Yesterday CTN clients count:", yesterdayClientCtnCount); // Log yesterday CTN clients count
            setClientCtnCountYesterday(yesterdayClientCtnCount);

            const currentClientCtnCount = [...new Set(ctnEnvois.map(envoi => envoi.nomClient))].length;
            console.log("[DashboardPage] Current CTN clients count:", currentClientCtnCount); // Log current CTN clients count
            setClientCtnCount(currentClientCtnCount);


            let totalTicketsYesterday = 0;
            let totalRmaTicketsYesterday = 0;
            let totalRmaTicketsCount = 0;
            let totalNewTicketsYesterday = 0;
            let totalNewTicketsCount = 0;


            const sectors = await fetchSectors();
            for (const sector of sectors) {
              const sectorId = sector.id;
              const sectorTickets = await fetchCollection(sectorId) as Ticket[];

              const newSectorTickets = sectorTickets.filter(ticket => ticket.statut === 'Nouveau');
              totalNewTicketsCount += newSectorTickets.length;
              const yesterdayNewSectorTicketsCount = newSectorTickets.filter(ticket =>
                ticket.dateCreation && ticket.dateCreation >= yesterdayStartISO && ticket.dateCreation <= yesterdayEndISO
              ).length;
              totalNewTicketsYesterday += yesterdayNewSectorTicketsCount;


              const yesterdaySectorTicketsCount = sectorTickets.filter(ticket =>
                ticket.dateCreation && ticket.dateCreation >= yesterdayStartISO && ticket.dateCreation <= yesterdayEndISO
              ).length;
              totalTicketsYesterday += yesterdaySectorTicketsCount;

              const rmaSectorTickets = sectorTickets.filter(ticket => ticket.statut === 'Demande de RMA');
              totalRmaTicketsCount += rmaSectorTickets.length;
              const yesterdayRmaSectorTicketsCount = rmaSectorTickets.filter(ticket =>
                ticket.dateCreation && ticket.dateCreation >= yesterdayStartISO && ticket.dateCreation <= yesterdayEndISO
              ).length;
              totalRmaTicketsYesterday += yesterdayRmaSectorTicketsCount;
            }

            setTicketsCountYesterday(totalTicketsYesterday);
            setRmaTicketsCount(totalRmaTicketsCount);
            setRmaTicketsCountYesterday(totalRmaTicketsYesterday);
            setNewTicketsCount(totalNewTicketsCount);
            setNewTicketsCountYesterday(totalNewTicketsYesterday);


          } catch (error) {
            console.error("Error fetching yesterday's counts:", error);
          } finally {
            if (isMounted && loadingCounts) setLoadingCounts(false);
          }
        };


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

                  if (loadingMapData) setLoadingMapData(false);
                  setErrorMapData(null);
                }
              }, (error) => {
                console.error(`[DashboardPage] Error listening to tickets for sector ${sectorId}:`, error);
                if (isMounted) {
                  setErrorMapData(prev => prev ? `${prev}, Erreur secteur ${sectorId}` : `Erreur chargement tickets secteur ${sectorId}`);
                }
              });
              ticketListenersRef.current.push(unsubscribe);
            });


          } catch (err) {
            console.error("[DashboardPage] Error fetching sectors or setting up ticket listeners:", err);
            if (isMounted) {
              const errorMsg = 'Erreur chargement données';
              setErrorCounts(errorMsg);
              setErrorMapData(errorMsg);
              setLoadingCounts(false);
              setLoadingMapData(false);
            }
          } finally {
            if (isMounted && loadingCounts) setLoadingCounts(false);
          }
        };

        const fetchSectorStatsData = async () => {
          try {
            const sectors = await fetchSectors();
            if (!sectors) {
              if (isMounted) {
                setLoadingSectorStats(false);
                setSectorStats([]);
              }
              return;
            }

            const stats: SectorData[] = [];
            for (const sector of sectors) {
              const sectorId = sector.id;
              const sectorTickets = await fetchCollection(sectorId) as Ticket[]; // Fetch tickets for each sector
              stats.push({
                sectorName: sector.id, // Assuming sector.id is the sector name
                ticketCount: sectorTickets.length,
              });
            }
            if (isMounted) {
              setSectorStats(stats);
              setLoadingSectorStats(false);
            }
          } catch (error) {
            console.error("Error fetching sector stats:", error);
            if (isMounted) {
              setErrorSectorStats("Erreur chargement stats secteur");
              setLoadingSectorStats(false);
            }
          }
        };


        Promise.all([setupTicketListeners(), fetchYesterdayCounts(), fetchSectorStatsData()]).then(() => {
          if (isMounted) {
            setLoadingCounts(false);
          }
        }).catch(() => {
          if (isMounted) {
            setLoadingCounts(false);
          }
        });


        return () => {
          isMounted = false;
          unsubscribeEnvoisCount();
          ticketListenersRef.current.forEach(unsubscribe => unsubscribe());
          ticketListenersRef.current = [];
        };
      }, []);


      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-jdc-white mb-4">Tableau de Bord</h1>

          <DashboardTiles
            envoisCount={envoisCount}
            ticketsCount={ticketsCount}
            loading={loadingCounts}
            error={errorCounts}
            envoisCountYesterday={envoisCountYesterday}
            ticketsCountYesterday={ticketsCountYesterday}
            rmaTicketsCount={rmaTicketsCount}
            rmaTicketsCountYesterday={rmaTicketsCountYesterday}
            clientCtnCount={clientCtnCount}
            clientCtnCountYesterday={clientCtnCountYesterday}
            newTicketsCount={newTicketsCount}
            newTicketsCountYesterday={newTicketsCountYesterday}
          />


          <div className="card bg-jdc-dark-gray shadow-lg border border-base-300">
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
                <div className="h-[400px] md:h-[500px] lg:h-[600px] w-full rounded overflow-hidden">
                  <InteractiveMap tickets={ticketsData} />
                </div>
              )}
              {!loadingMapData && !errorMapData && ticketsData.length === 0 && (
                <div className="text-center p-4 text-jdc-light-gray">Aucun ticket à afficher sur la carte.</div>
              )}
            </div>
          </div>

          {loadingSectorStats && (
            <div className="card bg-jdc-dark-gray shadow-lg border border-base-300">
              <div className="card-body p-4 md:p-6 flex justify-center items-center h-64 text-jdc-light-gray">
                <span className="loading loading-spinner loading-lg text-jdc-yellow mr-2"></span>
                Chargement des statistiques par secteur...
              </div>
            </div>
          )}
          {errorSectorStats && !loadingSectorStats && (
            <div className="card bg-jdc-dark-gray shadow-lg border border-base-300">
              <div className="card-body p-4 md:p-6 text-red-500 text-center">
                Erreur chargement stats secteurs: {errorSectorStats}
              </div>
            </div>
          )}
          {!loadingSectorStats && !errorSectorStats && (
            <SectorStats sectorStats={sectorStats} />
          )}

        </div>
      );
    };

    export default DashboardPage;
