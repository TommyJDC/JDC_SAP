import React from 'react';
import useGeminiSummary from '../../hooks/useGeminiSummary';

interface TicketDetailsProps {
  ticket: any | null;
  onClose: () => void;
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, onClose }) => {
  const { summary, isLoading, error } = useGeminiSummary(ticket?.demandeSAP);

  console.log("Ticket details component received ticket:", ticket); // Log pour vérifier le ticket reçu

  if (!ticket) {
    return null;
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg">{ticket.raisonSociale} - Ticket SAP {ticket.numeroSAP}</h3>
        <p className="py-4"><b>Code Client:</b> {ticket.codeClient}</p>
        <p className="py-4"><b>Adresse:</b> {ticket.adresse}</p>
        <p className="py-4"><b>Téléphone:</b> {ticket.telephone}</p>
        <p className="py-4"><b>Date:</b> {ticket.date}</p>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Demande SAP (Résumé IA)</h3>
          {isLoading && <span className="loading loading-dots loading-sm"></span>}
          {error && <p className="text-error">Erreur de résumé IA: {error}</p>}
          {summary && <p>{summary}</p>}
          {!summary && !isLoading && !error && <p>Aucun résumé disponible pour le moment.</p>}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Demande SAP (Complète)</h3>
          <p>{ticket.demandeSAP}</p>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Statut</h3>
          <div className="badge badge-secondary">{ticket.statut}</div>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Commentaires</h3>
          {ticket.commentaires && ticket.commentaires.length > 0 ? (
            <ul>
              {ticket.commentaires.map((commentaire, index) => (
                <li key={index}>{commentaire}</li>
              ))}
            </ul>
          ) : (
            <p>Aucun commentaire pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
