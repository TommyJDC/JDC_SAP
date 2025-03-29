import React, { useState, useEffect, useMemo } from 'react';
import { fetchTicketsBySectorService } from '../../services/firebaseService';

// Updated Ticket interface to include raisonSociale
interface Ticket {
  id: string;
  raisonSociale: string; // Use this field for client name
  description?: string; // Keep for potential future use or if needed by TicketDetails
  statut: string;
  adresse?: string;
  codeClient?: string;
  date?: string; // Ensure this field exists and has the correct date format
  demandeSAP?: string;
  messageId?: string;
  numeroSAP?: string;
  telephone?: string;
  // ... other fields
}

interface TicketListProps {
  selectedSector: string | null;
  onTicketSelect: (ticket: Ticket) => void;
}

// Helper function to group tickets by raisonSociale
const groupTicketsByClient = (tickets: Ticket[]): { [clientName: string]: Ticket[] } => {
  return tickets.reduce((acc, ticket) => {
    // Use raisonSociale for grouping, fallback to 'Client Inconnu'
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
  switch (status?.toLowerCase()) { // Use lowercase for robust comparison
    case 'en cours': return 'badge-warning';
    case 'a clôturée': return 'badge-info'; // Ensure this matches the value used in TicketDetails
    case 'terminée': return 'badge-success';
    case 'demande de rma': return 'badge-secondary';
    default: return 'badge-ghost';
  }
};


const TicketList: React.FC<TicketListProps> = ({ selectedSector, onTicketSelect }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      if (!selectedSector) {
        setTickets([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Ensure fetchTicketsBySectorService returns data including raisonSociale, codeClient, telephone, date, statut
        const fetchedTickets = await fetchTicketsBySectorService(selectedSector);
        // Cast to Ticket[] - make sure the fetched data matches the interface
        setTickets(fetchedTickets as Ticket[]);
        setError(null);
      } catch (err: any) {
        setError(`Erreur lors de la récupération des tickets pour ${selectedSector}: ${err.message}`);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [selectedSector]);

  // Group filtered tickets by raisonSociale
  const groupedTickets = useMemo(() => {
    const grouped = groupTicketsByClient(tickets);
    // Optional: Sort client groups by name
    // return Object.entries(grouped).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    return grouped;
  }, [tickets]);

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
    <div>
      {tickets.length === 0 && !loading && !error && selectedSector ? (
        <p className="text-center p-4">Aucun ticket trouvé pour le secteur {selectedSector}.</p>
      ) : tickets.length === 0 && !selectedSector ? (
         <p className="text-center p-4">Veuillez sélectionner un secteur.</p>
      ) : (
        clientNames.map((clientName) => (
          <div key={clientName} className="mb-6 p-4 border rounded-lg shadow-sm bg-base-200">
            {/* Display clientName (which is raisonSociale) */}
            <h3 className="text-xl font-semibold mb-3 sticky top-0 bg-base-200 py-2 z-10">{clientName} ({groupedTickets[clientName].length})</h3>
            <div className="space-y-4">
              {groupedTickets[clientName].map((ticket) => (
                <div
                  key={ticket.id} // Use Firestore document ID as key
                  onClick={() => onTicketSelect(ticket)}
                  className="card w-full bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="card-body p-4">
                    {/* Display ONLY Code Client, Téléphone, Date */}
                    <p className="text-sm"><b>Code Client:</b> {ticket.codeClient || 'N/A'}</p>
                    <p className="text-sm"><b>Téléphone:</b> {ticket.telephone || 'N/A'}</p>
                    <p className="text-sm"><b>Date:</b> {ticket.date || 'N/A'}</p> {/* Ensure 'date' field is available */}

                    {/* Keep the status badge at the bottom */}
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
