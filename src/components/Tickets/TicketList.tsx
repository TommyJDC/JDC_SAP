import React, { useState, useEffect, useCallback } from 'react';
    import { FaChevronDown, FaChevronUp, FaUserTie, FaInfoCircle, FaMapMarkerAlt, FaSpinner, FaCalendarAlt, FaPhone } from 'react-icons/fa';
    import { parseFrenchDate, formatDateForDisplay } from '../../utils/dateUtils';

    interface TicketListProps {
      groupedTickets: GroupedTickets;
      onSelectTicket: (ticket: Ticket) => void;
      selectedTicketId: string | null;
      groupByField: string;
      isLoadingGeo: boolean;
    }

    const TicketList: React.FC<TicketListProps> = ({ groupedTickets, onSelectTicket, selectedTicketId, groupByField, isLoadingGeo }) => {
      const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
      const [filteredGroups, setFilteredGroups] = useState<GroupedTickets>({});
      const [searchTerm, setSearchTerm] = useState('');
      const [showNumberOptions, setShowNumberOptions] = useState<Record<string, boolean>>({}); // Track dropdown visibility per ticket
      const [selectedNumber, setSelectedNumber] = useState<Record<string, string | null>>({}); // Track selected number per ticket


      useEffect(() => {
        console.log("[TicketList] useEffect - searchTerm:", searchTerm, "groupedTickets:", groupedTickets); // DEBUG LOG
        if (!searchTerm) {
          setFilteredGroups(groupedTickets);
          console.log("[TicketList] No search term, filteredGroups set to groupedTickets:", groupedTickets); // DEBUG LOG
          return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const newFilteredGroups: GroupedTickets = {};

        Object.entries(groupedTickets).forEach(([groupKey, tickets]) => {
          const filteredTickets = tickets.filter(ticket => {
            const ticketDate = ticket.date ? formatDateForDisplay(parseFrenchDate(ticket.date)).toLowerCase() : '';
            return (
              (ticket.raisonSociale?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.codeClient?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.numeroSAP?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.adresse?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.deducedSalesperson?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.telephone?.toLowerCase() || '').includes(lowerSearchTerm) ||
              (ticket.statut?.toLowerCase() || '').includes(lowerSearchTerm) ||
              ticketDate.includes(lowerSearchTerm)
            );
          });

          if (filteredTickets.length > 0) {
            newFilteredGroups[groupKey] = filteredTickets;
          }
        });

        setFilteredGroups(newFilteredGroups);
        console.log("[TicketList] Search term:", searchTerm, "filteredGroups:", newFilteredGroups); // DEBUG LOG
      }, [searchTerm, groupedTickets]);

      const handleWebexCall = useCallback((ticketId: string, phoneNumbers: string[]) => {
        if (phoneNumbers.length === 1) {
          window.location.href = `webexphone://call?uri=tel:${phoneNumbers[0]}`;
        } else if (phoneNumbers.length > 1) {
          setShowNumberOptions(prevState => ({ ...prevState, [ticketId]: true })); // Show options for this ticket
        }
      }, []);

      const handleNumberSelection = useCallback((ticketId: string, number: string) => {
        setSelectedNumber(prevState => ({ ...prevState, [ticketId]: number }));
        setShowNumberOptions(prevState => ({ ...prevState, [ticketId]: false })); // Hide options after selection
        window.location.href = `webexphone://call?uri=tel:${number}`; // Call selected number
      }, []);


      // ... reste du composant
      console.log("[TicketList] groupedTickets prop:", groupedTickets); // DEBUG LOG
      console.log("[TicketList] filteredGroups state:", filteredGroups); // DEBUG LOG

      return (
        <div>
          <input
            type="text"
            placeholder="Rechercher..."
            className="input input-bordered w-full max-w-xs mb-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {Object.entries(filteredGroups).map(([groupKey, tickets]) => (
            <div key={groupKey} className="mb-6 border rounded p-4 bg-jdc-gray-lighter">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedGroups(prevState => ({ ...prevState, [groupKey]: !prevState[groupKey] }))}>
                <h2 className="text-lg font-semibold text-jdc-white">{groupKey} ({tickets.length})</h2>
                <button onClick={(e) => {
                  e.stopPropagation(); // Prevent group collapse when toggling all
                  // Implement toggle all logic here if needed
                }} className="text-jdc-yellow hover:text-jdc-gold focus:outline-none">
                  {/* Toggle All Button - Implement if needed */}
                </button>
                <span className="text-jdc-yellow">
                  {expandedGroups[groupKey] ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </div>
              <div className={`overflow-hidden transition-height duration-300 ${expandedGroups[groupKey] ? 'max-h-96 p-2' : 'max-h-0'}`}>
                {tickets.map(ticket => {
                  const phoneNumbersArray = ticket.telephone?.split(',').map((num: string) => num.trim()) || [];
                  return (
                    <div
                      key={ticket.id}
                      className={`py-2 px-3 my-1 rounded cursor-pointer hover:bg-jdc-gray ${selectedTicketId === ticket.id ? 'bg-jdc-gray' : ''}`}
                      onClick={() => onSelectTicket(ticket)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <FaInfoCircle className="mr-2 text-jdc-lightblue" />
                          <span className="text-jdc-white">{ticket.numeroSAP || 'N/A'}</span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end">
                            <FaCalendarAlt className="mr-1 text-jdc-light-gray" />
                            <span className="text-sm text-jdc-light-gray">{ticket.date ? formatDateForDisplay(parseFrenchDate(ticket.date)) : 'Date N/A'}</span>
                          </div>
                          {ticket.telephone && (
                            <div className="flex items-center justify-end relative">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click
                                  handleWebexCall(ticket.id, phoneNumbersArray);
                                }}
                              >
                                <FaPhone className="mr-1 text-jdc-light-gray" />
                                <span className="text-sm text-jdc-yellow hover:text-jdc-gold">Appeler</span>
                              </button>
                              {showNumberOptions[ticket.id] && phoneNumbersArray.length > 1 && (
                                <ul className="menu bg-jdc-gray rounded mt-2 w-56 absolute right-0 top-6 z-10">
                                  {phoneNumbersArray.map((number, index) => (
                                    <li key={index} onClick={(e) => {
                                      e.stopPropagation();
                                      handleNumberSelection(ticket.id, number);
                                    }}>
                                      <a>{number}</a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <a
                                href={`webexphone://call?uri=tel:${phoneNumbersArray[0]}`}
                                className="text-sm text-jdc-yellow hover:text-jdc-gold hidden" // Hidden single number link
                              >
                                {ticket.telephone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center mt-1">
                        <FaUserTie className="mr-2 text-jdc-light-gray" />
                        <span className="text-sm text-jdc-light-gray">{ticket.deducedSalesperson}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <FaMapMarkerAlt className="mr-2 text-jdc-light-gray" />
                        <span className="text-sm text-jdc-light-gray truncate">{ticket.adresse}</span>
                        {isLoadingGeo && <FaSpinner className="ml-1 text-jdc-yellow animate-spin" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(filteredGroups).length === 0 && !isLoadingGeo && searchTerm !== "" && (
            <p className="text-center text-jdc-white py-4">Aucun ticket trouvé pour la recherche "{searchTerm}".</p>
          )}
           {Object.keys(filteredGroups).length === 0 && !isLoadingGeo && searchTerm === "" && Object.keys(groupedTickets).length > 0 && (
            <p className="text-center text-jdc-white py-4">Aucun ticket trouvé.</p>
          )}
        </div>
      );
    };

    export default TicketList;
