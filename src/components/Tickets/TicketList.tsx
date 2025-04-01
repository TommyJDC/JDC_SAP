import React from 'react';
import { FaChevronDown, FaChevronRight, FaUserTie } from 'react-icons/fa'; // Added FaUserTie

interface Ticket {
  id: string;
  raisonSociale?: string;
  codeClient?: string;
  numeroSAP?: string;
  statut?: string;
  salesperson?: string; // Expect salesperson field
  [key: string]: any; // Allow other fields
}

interface GroupedTickets {
  [key: string]: Ticket[];
}

interface TicketListProps {
  groupedTickets: GroupedTickets;
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicketId?: string | null;
  groupByField: 'raisonSociale'; // Currently only supports grouping by raisonSociale
}

const TicketList: React.FC<TicketListProps> = ({
  groupedTickets,
  onSelectTicket,
  selectedTicketId,
  groupByField, // Keep prop for potential future flexibility
}) => {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  // Effect to potentially open the group of the selected ticket
  React.useEffect(() => {
    if (selectedTicketId) {
      const groupKey = Object.keys(groupedTickets).find(key =>
        groupedTickets[key].some(ticket => ticket.id === selectedTicketId)
      );
      if (groupKey && !openGroups[groupKey]) {
        setOpenGroups(prev => ({ ...prev, [groupKey]: true }));
      }
    }
    // Intentionally not depending on groupedTickets or openGroups to avoid loops
    // This effect only runs when the selectedTicketId changes from the outside
  }, [selectedTicketId]);


  const toggleGroup = (groupKey: string) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const groupKeys = Object.keys(groupedTickets).sort(); // Sort groups alphabetically

  if (groupKeys.length === 0) {
    return <p className="text-center text-gray-500">Aucun ticket à afficher.</p>;
  }

  return (
    <div className="space-y-2">
      {groupKeys.map((groupKey) => {
        const ticketsInGroup = groupedTickets[groupKey];
        const isGroupOpen = openGroups[groupKey] ?? false; // Default to closed

        return (
          <div key={groupKey} className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-md">
             <input
                type="checkbox"
                checked={isGroupOpen}
                onChange={() => toggleGroup(groupKey)}
                className="min-h-0 p-0" // DaisyUI checkbox hack for collapse control
                aria-label={`Toggle group ${groupKey}`}
             />
            <div
              className="collapse-title text-md font-medium cursor-pointer flex justify-between items-center p-2 min-h-0"
              onClick={() => toggleGroup(groupKey)} // Also allow clicking title
            >
              <span>{groupKey} ({ticketsInGroup.length})</span>
              {/* Icon managed by collapse-arrow */}
            </div>
            <div className={`collapse-content p-0 ${isGroupOpen ? 'expanded' : ''}`}>
              <ul className="menu menu-sm bg-base-100 p-0 [&_li>*]:rounded-none">
                {ticketsInGroup.map((ticket) => (
                  <li key={ticket.id}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectTicket(ticket);
                      }}
                      className={`flex justify-between items-center p-2 ${ticket.id === selectedTicketId ? 'active' : ''}`}
                    >
                      <div className="flex-1 overflow-hidden mr-2">
                        <span className="block truncate text-xs font-semibold">
                          {ticket.numeroSAP || ticket.codeClient || `ID: ${ticket.id.substring(0, 6)}...`}
                        </span>
                        <span className="block truncate text-xs text-gray-500">
                          Statut: {ticket.statut || 'N/A'}
                        </span>
                         {/* Display Salesperson */}
                         {ticket.salesperson && (
                            <span className="block truncate text-xs text-info mt-1 flex items-center">
                                <FaUserTie className="mr-1 flex-shrink-0" />
                                {ticket.salesperson}
                            </span>
                         )}
                      </div>
                      {/* Optional: Add a small indicator like status color */}
                      {/* <span className={`h-2 w-2 rounded-full ${getStatusColor(ticket.statut)}`}></span> */}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper function for status color (example)
// const getStatusColor = (status?: string): string => {
//   switch (status?.toLowerCase()) {
//     case 'en cours': return 'bg-blue-500';
//     case 'terminé': return 'bg-green-500';
//     case 'annulé': return 'bg-red-500';
//     case 'demande de rma': return 'bg-orange-500';
//     default: return 'bg-gray-400';
//   }
// };

export default TicketList;
