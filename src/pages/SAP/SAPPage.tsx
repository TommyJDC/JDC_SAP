import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { useNavigate } from 'react-router-dom';
    import {
      listenToTicketsBySector,
      fetchUsers,
    } from '../../services/firebaseService';
    import { useUserSectors } from '../../context/UserContext';
    import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
    import TicketList from '../../components/Tickets/TicketList';
    import TicketDetails from '../../components/Tickets/TicketDetails';
    import useGeoCoding from '../../hooks/useGeoCoding'; // Import the hook
    import { kmlZones } from '../../utils/kmlZones'; // Import KML zones
    import { point, Feature, Polygon } from '@turf/helpers'; // Import Turf types
    import booleanPointInPolygon from '@turf/boolean-point-in-polygon'; // Import Turf function
    import { parseFrenchDate } from '../../utils/dateUtils'; // Import the date parser
    import { FaSpinner, FaFilter } from 'react-icons/fa';

    // Define types for tickets
    interface Ticket {
      id: string;
      secteur: string;
      raisonSociale?: string;
      adresse?: string;
      codeClient?: string;
      numeroSAP?: string;
      telephone?: string;
      summary?: string;
      statut?: string;
      deducedSalesperson?: string; // Field for salesperson deduced from KML
      date?: string; // Changed from dateCreation - this is the raw string from Firebase
      parsedDate?: Date | null; // Added field for the parsed Date object
      // Allow other potential fields
      [key: string]: any;
    }

    // Type for grouped tickets
    interface GroupedTickets {
      [key: string]: Ticket[];
    }

    // Type for user data including role
    interface AppUser extends User {
        role?: string;
    }


    const SAPPage: React.FC = () => {
      const navigate = useNavigate();
      const { userSectors, loadingSectors: loadingUserSectors, errorSectors: errorUserSectors } = useUserSectors();
      const [rawTickets, setRawTickets] = useState<Ticket[]>([]); // Store raw tickets from Firebase
      const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
      const [errorTickets, setErrorTickets] = useState<string | null>(null);
      const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
      const [loadingUserRole, setLoadingUserRole] = useState<boolean>(true);
      const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
      const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>(''); // State for sector filter

      // --- Geocoding ---
      const uniqueAddresses = useMemo(() => {
        const addresses = rawTickets
          .map(ticket => ticket.adresse)
          .filter((addr): addr is string => !!addr && addr.trim() !== '');
        return Array.from(new Set(addresses));
      }, [rawTickets]);

      const { coordinates, isLoading: isLoadingGeo, error: errorGeo } = useGeoCoding(uniqueAddresses);
      // --- End Geocoding ---

      // Fetch current user's role
      useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
          if (authUser) {
            setLoadingUserRole(true);
            try {
              const allUsers = await fetchUsers();
              const userData = allUsers.find(u => u.email === authUser.email);
              setCurrentUser({ ...authUser, role: userData?.role });
            } catch (error) {
              console.error("Error fetching user role:", error);
              setCurrentUser(authUser);
            } finally {
              setLoadingUserRole(false);
            }
          } else {
            setCurrentUser(null);
            setLoadingUserRole(false);
          }
        });
        return () => unsubscribeAuth();
      }, []);


      // Listen to tickets based on user's assigned sectors
      useEffect(() => {
        if (loadingUserSectors || userSectors === null) {
            setLoadingTickets(userSectors === null && !loadingUserSectors ? false : true);
            if (userSectors === null && !loadingUserSectors) {
                setRawTickets([]);
            }
            return;
        }

        if (userSectors.length === 0) {
          setLoadingTickets(false);
          setRawTickets([]);
          console.log("[SAPPage] No sectors assigned to user.");
          return;
        }

        setLoadingTickets(true);
        setErrorTickets(null);
        console.log(`[SAPPage] Setting up listeners for sectors: ${userSectors.join(', ')}`);

        const sectorTicketsMap = new Map<string, Ticket[]>();

        const unsubscribes = userSectors.map(sectorId => {
          return listenToTicketsBySector(
            sectorId,
            (sectorTickets) => {
              sectorTicketsMap.set(sectorId, sectorTickets);
              let combinedTickets: Ticket[] = [];
              sectorTicketsMap.forEach(tickets => {
                combinedTickets = combinedTickets.concat(tickets);
              });
              setRawTickets(combinedTickets); // Update raw tickets
              console.log("[SAPPage] rawTickets updated:", combinedTickets); // DEBUG LOG
              setLoadingTickets(false);
            },
            (error) => {
              console.error(`Error listening to tickets for sector ${sectorId}:`, error);
              setErrorTickets(`Erreur temps-réel tickets (${sectorId}).`);
            }
          );
        });

        return () => {
          console.log(`[SAPPage] Cleaning up ticket listeners for sectors: ${userSectors.join(', ')}`);
          unsubscribes.forEach(unsub => unsub());
        };
      }, [userSectors, loadingUserSectors]);

      // Process tickets: Filter, deduce salesperson, parse date, and SORT
      const processedTickets = useMemo(() => {
        console.log(`[SAPPage] Processing ${rawTickets.length} raw tickets. Filter: '${selectedSectorFilter}'. Coords available: ${coordinates.size}`);

        const ticketsWithParsedData = rawTickets
          .filter(ticket => {
            // Filter by selected sector, or show all if filter is empty
            return !selectedSectorFilter || ticket.secteur === selectedSectorFilter;
          })
          .map(ticket => {
            // --- DEBUG LOG ---
            console.log(`[SAPPage DEBUG ${ticket.id}] Processing ticket. Raw date:`, ticket.date);
            // --- END DEBUG LOG ---

            // 1. Parse Date
            const parsedDate = parseFrenchDate(ticket.date);

            // --- DEBUG LOG ---
            console.log(`[SAPPage DEBUG ${ticket.id}] Parsed date result:`, parsedDate);
            // --- END DEBUG LOG ---

            // 2. Deduce Salesperson
            let deducedSalesperson = 'Non déterminé';
            const address = ticket.adresse;
            if (address && coordinates.has(address)) {
              const coords = coordinates.get(address);
              if (coords) {
                try {
                  const customerPoint = point([coords.lng, coords.lat]);
                  const matchingZone = kmlZones.find(zone =>
                    booleanPointInPolygon(customerPoint, zone.feature as Feature<Polygon>)
                  );
                  deducedSalesperson = matchingZone ? matchingZone.name : 'Hors zone';
                } catch (e) {
                   console.error(`[SAPPage] Error checking point in polygon for address "${address}":`, e);
                   deducedSalesperson = 'Erreur géozone';
                }
              } else {
                 deducedSalesperson = 'Géocodage échoué';
              }
            } else if (address) {
              deducedSalesperson = 'Géocodage en attente';
            }

            return { ...ticket, parsedDate, deducedSalesperson }; // Add parsed date and deduced salesperson
          });

        // 3. Sort by Parsed Date (Newest First)
        ticketsWithParsedData.sort((a, b) => {
            const dateA = a.parsedDate?.getTime() ?? 0; // Treat null/invalid dates as oldest (timestamp 0)
            const dateB = b.parsedDate?.getTime() ?? 0;
            return dateB - dateA; // Descending order
        });

        console.log("[SAPPage] processedTickets:", ticketsWithParsedData); // DEBUG LOG
        return ticketsWithParsedData;

      }, [rawTickets, coordinates, selectedSectorFilter]); // Dependencies: raw tickets, coordinates map, sector filter

      // Group processed tickets by raisonSociale for the TicketList component
      const groupedTickets = useMemo(() => {
        const grouped = processedTickets.reduce((acc, ticket) => {
          const key = ticket.raisonSociale || 'Client Inconnu';
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(ticket);
          return acc;
        }, {} as GroupedTickets);
        console.log("[SAPPage] groupedTickets:", grouped); // DEBUG LOG
        return grouped;
      }, [processedTickets]); // Dependency: processed tickets


      // Handle selecting a ticket to view details
      const handleSelectTicket = useCallback((ticket: Ticket) => {
        console.log("[SAPPage] Opening details for ticket:", ticket);
        setSelectedTicket(ticket);
      }, []);

      // Handle closing the details modal
      const handleCloseDetails = useCallback(() => {
        console.log("[SAPPage] Closing details modal.");
        setSelectedTicket(null);
      }, []);

      // Callback for when a ticket is updated (e.g., in TicketDetails)
      const handleTicketUpdated = useCallback(() => {
        console.log("[SAPPage] Ticket update detected (via callback), relying on listener for refresh.");
        // Listener should handle the refresh
      }, []);

      const handleSectorFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSectorFilter(event.target.value);
      };

      const isLoading = loadingUserSectors || loadingTickets || (uniqueAddresses.length > 0 && isLoadingGeo && coordinates.size < uniqueAddresses.length);
      const totalTicketCount = rawTickets.length; // Count before filtering/processing
      const displayedTicketCount = processedTickets.length; // Count after filtering/processing

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-jdc-white">Gestion des Tickets SAP ({displayedTicketCount} / {totalTicketCount})</h1>
            {/* Sector Filter Dropdown */}
            {userSectors && userSectors.length > 0 && (
              <div className="flex items-center gap-2">
                 <FaFilter className="text-jdc-light-gray" />
                 <select
                   className="select select-bordered select-sm bg-jdc-gray focus:border-jdc-yellow"
                   value={selectedSectorFilter}
                   onChange={handleSectorFilterChange}
                 >
                   <option value="">Tous mes secteurs</option>
                   {userSectors.map(sector => (
                     <option key={sector} value={sector}>{sector}</option>
                   ))}
                 </select>
              </div>
            )}
          </div>


          {/* Display loading or error states */}
           {loadingUserSectors && <p className="text-jdc-light-gray mb-4">Chargement des secteurs utilisateur...</p>}
           {errorUserSectors && <p className="text-red-500 mb-4">Erreur chargement secteurs: {errorUserSectors}</p>}
           {errorTickets && <p className="text-red-500 mb-4">{errorTickets}</p>}
           {errorGeo && <p className="text-orange-500 mb-4">Erreur Géocodage: {errorGeo}</p>}

          {/* Tickets Section */}
          <div>
            {isLoading && displayedTicketCount === 0 ? (
              <div className="flex justify-center items-center py-10">
                  <span className="loading loading-spinner loading-lg text-jdc-yellow mr-3"></span> Chargement des tickets et données géographiques...
              </div>
            ) : !isLoading && displayedTicketCount === 0 ? (
               <p className="text-center text-gray-500 py-10">
                 {selectedSectorFilter ? `Aucun ticket trouvé pour le secteur '${selectedSectorFilter}'.` : 'Aucun ticket trouvé pour vos secteurs.'}
               </p>
            ) : (
              <TicketList
                groupedTickets={groupedTickets}
                onSelectTicket={handleSelectTicket}
                selectedTicketId={selectedTicket?.id}
                groupByField="raisonSociale"
                isLoadingGeo={isLoadingGeo && coordinates.size < uniqueAddresses.length} // Pass geo loading status
              />
            )}
          </div>

          {/* Ticket Details Modal */}
          {selectedTicket && (
            <TicketDetails
              ticket={selectedTicket}
              onClose={handleCloseDetails}
              sectorId={selectedTicket.secteur}
              onTicketUpdated={handleTicketUpdated}
            />
          )}

        </div>
      );
    };

    export default SAPPage;
