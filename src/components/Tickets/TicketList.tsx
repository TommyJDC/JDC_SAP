import React from 'react';

// Updated Ticket interface (ensure it matches the data structure in SAPPage)
interface Ticket {
  id: string;
  raisonSociale?: string; // Grouping key
  description?: string;
  statut?: string;        // For badge
  adresse?: string;
  codeClient?: string;    // Display field
  date?: string;          // Display field
  demandeSAP?: string;
  messageId?: string;
  numeroSAP?: string;     // Display field
  telephone?: string;     // Display field
  secteur?: string;       // May not be needed if data comes pre-filtered
  // ... other fields
  [key: string]: any; // Allow other properties
}

// Simplified Props: Expects pre-grouped data
interface TicketListProps {
  groupedTickets: Record<string, Ticket[]>; // Directly accept grouped tickets
  onSelectTicket: (ticket: Ticket) => void; // Function to handle ticket selection
  selectedTicketId?: string | null;         // ID of the currently selected ticket for highlighting (optional)
  groupByField: 'raisonSociale'; // Explicitly state the grouping field used by the parent (for clarity)
}

// Define badge classes based on status (consistent with TicketDetails)
const getStatusBadgeClass = (status?: string): string => {
  switch (status?.toLowerCase()) {
    case 'en cours': return 'badge-warning';
    case 'à clôturer': return 'badge-info';
    case 'terminée': return 'badge-success';
    case 'demande de rma': return 'badge-secondary';
    default: return 'badge-ghost';
  }
};

const TicketList: React.FC<TicketListProps> = ({
  groupedTickets,
  onSelectTicket,
  selectedTicketId,
  // groupByField is mainly for documentation/clarity here, as grouping is done by parent
}) => {

  // No internal state for tickets, loading, error, or filters needed anymore.
  // No internal useEffect for fetching needed.
  // No internal useMemo for filtering/grouping needed.

  // Get sorted client names (group keys) directly from the prop
  const groupKeys = Object.keys(groupedTickets).sort();

  if (groupKeys.length === 0) {
    return (
      <p className="text-center p-4 text-gray-500">
        Aucun ticket à afficher pour la sélection ou les filtres actuels.
      </p>
    );
  }

  return (
    <div className="w-full"> {/* Ensure the root container takes full width */}
      {groupKeys.map((groupKey) => (
        // Client group container
        <div key={groupKey} className="w-full mb-6 p-4 border rounded-lg shadow-sm bg-base-200">
          {/* Sticky header for the group (e.g., Raison Sociale) */}
          <h3 className="text-xl font-semibold mb-3 sticky top-0 bg-base-200 py-2 z-10">
            {groupKey} ({groupedTickets[groupKey].length})
          </h3>
          {/* List of tickets within the group */}
          <div className="space-y-3"> {/* Slightly reduced spacing */}
            {groupedTickets[groupKey].map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                // Highlight selected ticket
                className={`
                  card w-full bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200
                  ${selectedTicketId === ticket.id ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}
              >
                <div className="card-body p-3"> {/* Slightly reduced padding */}
                  {/* Display relevant ticket info */}
                  <p className="text-sm font-medium truncate" title={ticket.raisonSociale}>
                     {/* Raison Sociale is the group key, maybe show Code Client here? */}
                     <b>Code Client:</b> {ticket.codeClient || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    <b>Téléphone:</b> {ticket.telephone || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    <b>Date:</b> {ticket.date || 'N/A'} {/* Confirm which date field is correct */}
                  </p>
                  {ticket.numeroSAP && (
                    <p className="text-xs text-gray-600">
                      <b>N° SAP:</b> {ticket.numeroSAP}
                    </p>
                  )}

                  {/* Status badge at the bottom right */}
                  <div className="card-actions justify-end items-center mt-1">
                     <div className={`badge badge-sm ${getStatusBadgeClass(ticket.statut)}`}>
                       {ticket.statut || 'N/A'}
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketList;
