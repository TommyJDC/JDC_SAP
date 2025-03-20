import React from 'react';

interface TicketListProps {
  tickets: any[];
  onTicketSelect: (ticket: any) => void;
}

const TicketList: React.FC<TicketListProps> = ({ tickets, onTicketSelect }) => {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        {/* head */}
        <thead>
          <tr>
            <th>Numéro SAP</th>
            <th>Raison Sociale</th>
            <th>Date</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id} onClick={() => onTicketSelect(ticket)} className="hover cursor-pointer">
              <td>{ticket.numeroSAP}</td>
              <td>{ticket.raisonSociale}</td>
              <td>{ticket.date}</td>
              <td>{ticket.statut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TicketList;
