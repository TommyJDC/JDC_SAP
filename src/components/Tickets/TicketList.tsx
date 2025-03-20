import React, { useState, useEffect } from 'react';
import { fetchTicketsBySectorService } from '../../services/firebaseService';
import TicketDetails from './TicketDetails';

interface TicketListProps {
  secteur: string | null;
  onTicketSelect: (ticket: any) => void;
}

const TicketList: React.FC<TicketListProps> = ({ secteur, onTicketSelect }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      setError(null);
      if (secteur) {
        try {
          const fetchedTickets = await fetchTicketsBySectorService(secteur);
          setTickets(fetchedTickets);
          setError(null);
        } catch (err: any) {
          setError(`Erreur lors de la récupération des tickets: ${err.message}`);
          setTickets([]);
        } finally {
          setLoading(false);
        }
      } else {
        setTickets([]);
        setLoading(false);
      }
    };

    loadTickets();
  }, [secteur]);

  if (loading) {
    return <span className="loading loading-dots loading-lg"></span>;
  }

  if (error) {
    return <div className="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>{error}</span>
    </div>;
  }

  const getStatusClassName = (statut: string) => {
    switch (statut) {
      case 'Ouvert':
        return 'bg-gray-400 text-white';
      case 'En cours':
        return 'bg-orange-500 text-white';
      case 'A Clôturée':
        return 'bg-red-500 text-white';
      case 'Terminée':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusText = (statut: string) => {
    switch (statut) {
      case 'Ouvert':
        return 'Ouvert';
      case 'En cours':
        return 'En cours';
      case 'A Clôturée':
        return 'A Clôturée';
      case 'Terminée':
        return 'Terminée';
      default:
        return statut;
    }
  };

  return (
    <div>
      {tickets.length === 0 && secteur && !loading && !error ? (
        <p>Aucun ticket disponible pour le secteur sélectionné.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Raison Sociale</th>
                <th>Numéro SAP</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} onClick={() => onTicketSelect(ticket)} className="hover:bg-gray-100 cursor-pointer">
                  <td>{ticket.raisonSociale}</td>
                  <td>{ticket.numeroSAP}</td>
                  <td>{ticket.date}</td>
                  <td>
                    <div className={`rounded-full px-3 py-1 font-semibold text-sm text-center ${getStatusClassName(ticket.statut)}`}>
                      {getStatusText(ticket.statut)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TicketList;
