import React, { useState, useEffect, useMemo } from 'react';
import { fetchTicketsBySectorService } from '../../services/firebaseService';

// Updated Ticket interface to include raisonSociale and secteur
interface Ticket {
  id: string;
  raisonSociale: string; // Use this field for client name and filtering
  description?: string;
  statut: string;        // Use this field for filtering
  adresse?: string;
  codeClient?: string;    // Use this field for filtering
  date?: string;
  demandeSAP?: string;
  messageId?: string;
  numeroSAP?: string;     // Use this field for filtering
  telephone?: string;
  secteur: string;       // Added secteur
  // ... other fields
}

interface TicketListProps {
  selectedSector: string | null;
  onTicketSelect: (ticket: Ticket) => void;
  // Filter props
  searchTermRaisonSociale: string;
  searchTermCodeClient: string;
  searchTermNumeroSAP: string;
  filterStatus: string;
}

// Helper function to group tickets by raisonSociale
const groupTicketsByClient = (tickets: Ticket[]): { [clientName: string]: Ticket[] } => {
  return tickets.reduce((acc, ticket) => {
    const clientName = ticket.raisonSociale || 'Client Inconnu';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(ticket);
    // Optional: Sort tickets within each client group, e.g., by date or numeroSAP
    // acc[clientName].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return acc;
  }, {} as { [clientName: string]: Ticket[] });
};

// Define badge classes based on status (consistent with TicketDetails)
const getStatusBadgeClass = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'en cours': return 'badge-warning';
    case 'à clôturer': return 'badge-info'; // Corrected value
    case 'terminée': return 'badge-success';
    case 'demande de rma': return 'badge-secondary';
    default: return 'badge-ghost';
  }
};


const TicketList: React.FC<TicketListProps> = ({
  selectedSector,
  onTicketSelect,
  searchTermRaisonSociale,
  searchTermCodeClient,
  searchTermNumeroSAP,
  filterStatus
}) => {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Store all tickets for the sector
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      if (!selectedSector) {
        setAllTickets([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fetchedTickets = await fetchTicketsBySectorService(selectedSector);
        // Add the sector to each ticket object
        const ticketsWithSector = fetchedTickets.map(ticket => ({
          ...ticket,
          secteur: selectedSector // Add sector info
        })) as Ticket[];
        setAllTickets(ticketsWithSector);
        setError(null);
      } catch (err: any) {
        setError(`Erreur lors de la récupération des tickets pour ${selectedSector}: ${err.message}`);
        setAllTickets([]);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [selectedSector]); // Only refetch when sector changes

  // Filter tickets based on search terms and status filter
  const filteredTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      const raisonSocialeMatch = ticket.raisonSociale?.toLowerCase().includes(searchTermRaisonSociale.toLowerCase());
      const codeClientMatch = ticket.codeClient?.toLowerCase().includes(searchTermCodeClient.toLowerCase());
      const numeroSAPMatch = ticket.numeroSAP?.toLowerCase().includes(searchTermNumeroSAP.toLowerCase());
      const statusMatch = filterStatus ? ticket.statut?.toLowerCase() === filterStatus.toLowerCase() : true; // Check status if filter is set

      return raisonSocialeMatch && codeClientMatch && numeroSAPMatch && statusMatch;
    });
  }, [allTickets, searchTermRaisonSociale, searchTermCodeClient, searchTermNumeroSAP, filterStatus]);

  // Group filtered tickets by raisonSociale
  const groupedTickets = useMemo(() => {
    return groupTicketsByClient(filteredTickets);
  }, [filteredTickets]);

  if (loading) {
    return <div className="flex justify-center items-center p-4"><span className="loading loading-dots loading-lg"></span></div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{error}</span>
      </div>
    );
  }

  // Get sorted client names (based on raisonSociale)
  const clientNames = Object.keys(groupedTickets).sort();

  return (
    <div className="w-full"> {/* Ensure the root container takes full width */}
      {filteredTickets.length === 0 && !loading && !error && selectedSector ? (
        <p className="text-center p-4">Aucun ticket trouvé pour les filtres actuels dans le secteur {selectedSector}.</p>
      ) : allTickets.length === 0 && !selectedSector ? (
         <p className="text-center p-4">Veuillez sélectionner un secteur.</p>
      ) : (
        clientNames.map((clientName) => (
          // Added w-full to this div to make the client group container take full width
          <div key={clientName} className="w-full mb-6 p-4 border rounded-lg shadow-sm bg-base-200">
            <h3 className="text-xl font-semibold mb-3 sticky top-0 bg-base-200 py-2 z-10">{clientName} ({groupedTickets[clientName].length})</h3>
            <div className="space-y-4">
              {groupedTickets[clientName].map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => onTicketSelect(ticket)}
                  // The card already has w-full, so it should expand within the client group div
                  className="card w-full bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="card-body p-4">
                    <p className="text-sm"><b>Code Client:</b> {ticket.codeClient || 'N/A'}</p>
                    <p className="text-sm"><b>Téléphone:</b> {ticket.telephone || 'N/A'}</p>
                    <p className="text-sm"><b>Date:</b> {ticket.date || 'N/A'}</p>
                    {ticket.numeroSAP && <p className="text-sm"><b>N° SAP:</b> {ticket.numeroSAP}</p>} {/* Show Numero SAP if available */}

                    <div className="card-actions justify-end items-center mt-2">
                       <div className={`badge ${getStatusBadgeClass(ticket.statut)}`}>
                         {ticket.statut || 'N/A'}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TicketList;
