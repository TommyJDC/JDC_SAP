import React, { useState, useEffect } from 'react';
import useGeminiSummary from '../../hooks/useGeminiSummary';
import { updateTicket } from '../../services/firebaseService';
import ReactMarkdown from 'react-markdown';

interface TicketDetailsProps {
  ticket: any | null;
  onClose: () => void;
  sectorId: string;
  onTicketUpdated: () => void;
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, onClose, sectorId, onTicketUpdated }) => {
  const [summary, setSummary] = useState<string | null>(ticket?.summary || null);
  const [solution, setSolution] = useState<string | null>(ticket?.solution || null);
  const [isLoading, setIsLoading] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>(ticket?.statut || 'En cours'); // Default to 'En cours' if no status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  const { summarizeTicket } = useGeminiSummary(ticket?.demandeSAP);

  useEffect(() => {
    const loadData = async () => {
      if (ticket) {
        if (!ticket.summary && ticket?.demandeSAP) {
          await generateSummary();
        }
        if (!ticket.solution && ticket?.demandeSAP) {
          await generateSolution();
        }
        setCurrentStatus(ticket.statut || 'En cours'); // Ensure status is initialized from ticket or default
      }
    };

    loadData();
  }, [ticket?.id, sectorId, ticket?.demandeSAP, ticket?.statut]);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const generatedSummary = await summarizeTicket(ticket?.demandeSAP);
      if (generatedSummary) {
        setSummary(generatedSummary);
        if (sectorId && ticket?.id) {
          await updateTicket(sectorId, ticket.id, { summary: generatedSummary });
        } else {
          console.error("SectorId or ticket.id is missing, cannot update ticket", sectorId, ticket?.id);
          setError("Impossible de mettre à jour le ticket: SectorId ou Ticket ID manquant.");
        }
      } else {
        setError('Impossible de générer un résumé.');
        setSummary(null);
      }
    } catch (err: any) {
      setError(`Erreur lors de la génération du résumé: ${err.message}`);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSolution = async () => {
    setSolutionLoading(true);
    setSolutionError(null);
    try {
      const generatedSolution = await summarizeTicket(`Propose une solution pour ce problème: ${ticket?.demandeSAP}`);
      if (generatedSolution) {
        setSolution(generatedSolution);
        if (sectorId && ticket?.id) {
          await updateTicket(sectorId, ticket.id, { solution: generatedSolution });
        } else {
          console.error("SectorId or ticket.id is missing, cannot update ticket", sectorId, ticket?.id);
          setSolutionError("Impossible de mettre à jour le ticket: SectorId ou Ticket ID manquant.");
        }
      } else {
        setSolutionError('Impossible de générer une solution.');
        setSolution(null);
      }
    } catch (err: any) {
      setSolutionError(`Erreur lors de la génération de la solution: ${err.message}`);
      setSolution(null);
    } finally {
      setSolutionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() && sectorId && ticket?.id) {
      const updatedComments = [...(ticket.commentaires || []), newComment];
      try {
        await updateTicket(sectorId, ticket.id, { commentaires: updatedComments });
        // Update local ticket state to reflect new comment immediately
        // Assuming ticket prop is immutable, create a new ticket object
        const updatedTicket = { ...ticket, commentaires: updatedComments };
        // You might need to lift state up or use context for global state update if needed
        // For now, just update the local state for display in this modal
        // If TicketDetails is directly receiving ticket as prop and not from a useState,
        // you might need to refresh the ticket list to see the comment reflected there.
        setNewComment(''); // Clear comment input after successful submission
        onTicketUpdated(); // Call refresh function after comment is added
      } catch (error: any) {
        setError(`Erreur lors de l'ajout du commentaire: ${error.message}`);
      }
    }
  };

  const handleStatusChange = async () => {
    if (sectorId && ticket?.id && currentStatus) {
      setIsUpdatingStatus(true);
      setStatusUpdateError(null);
      try {
        await updateTicket(sectorId, ticket.id, { statut: currentStatus });
        // Optionally update local ticket state or refresh data
        setIsUpdatingStatus(false);
        onTicketUpdated(); // Call refresh function after status is updated
      } catch (error: any) {
        setStatusUpdateError(`Erreur lors de la mise à jour du statut: ${error.message}`);
        setIsUpdatingStatus(false);
      }
    }
  };

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
          <h3 className="text-lg font-semibold">Demande SAP</h3>
          {isLoading && <span className="loading loading-dots loading-sm"></span>}
          {error && <p className="text-error">Erreur de résumé: {error}</p>}
          {summary && <ReactMarkdown>{summary}</ReactMarkdown>}
          {!summary && !isLoading && !error && <p>Aucun résumé disponible pour le moment.</p>}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Solution Proposée</h3>
          {solutionLoading && <span className="loading loading-dots loading-sm"></span>}
          {solutionError && <p className="text-error">{solutionError}</p>}
          {solution && <ReactMarkdown>{solution}</ReactMarkdown>}
          {!solution && !solutionLoading && !solutionError && <p>Aucune solution générée pour le moment.</p>}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Statut</h3>
          <div className={`badge badge-secondary`}>{ticket.statut}</div>
        </div>

        {/* Status Update Section */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Modifier le Statut</h3>
          <select
            className="select select-bordered w-full max-w-xs"
            value={currentStatus}
            onChange={(e) => setCurrentStatus(e.target.value)}
            disabled={isUpdatingStatus}
          >
            <option disabled>Choisir le statut</option>
            <option value="En cours">En cours</option>
            <option value="A Clôturée">A Clôturée</option>
            <option value="Terminée">Terminée</option>
          </select>
          <button className="btn btn-primary mt-2" onClick={handleStatusChange} loading={isUpdatingStatus}>
            {isUpdatingStatus ? 'Mise à jour...' : 'Mettre à jour le statut'}
          </button>
          {statusUpdateError && <p className="text-error">{statusUpdateError}</p>}
        </div>


        {/* Add Comment Section */}
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
          <textarea
            placeholder="Ajouter un commentaire"
            className="textarea textarea-bordered w-full mt-2"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          ></textarea>
          <button className="btn btn-primary mt-2" onClick={handleAddComment}>Ajouter un commentaire</button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
