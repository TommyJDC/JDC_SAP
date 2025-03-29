import React, { useState, useEffect, useMemo } from 'react';
import useGeminiSummary from '../../hooks/useGeminiSummary';
import { updateTicket } from '../../services/firebaseService';
import ReactMarkdown from 'react-markdown';

interface TicketDetailsProps {
  ticket: any | null;
  onClose: () => void;
  sectorId: string;
  onTicketUpdated: () => void;
}

// Function to determine the initial status
const getInitialStatus = (ticket: any): string => {
  // Check if demandeSAP contains "demande de rma" (case-insensitive)
  if (ticket?.demandeSAP?.toLowerCase().includes('demande de rma')) {
    return 'Demande de RMA';
  }
  // Otherwise, return the existing status or default to 'En cours'
  return ticket?.statut || 'En cours';
};

// Define badge classes based on status (consistent with TicketList)
const getStatusBadgeClass = (status: string): string => {
  switch (status?.toLowerCase()) { // Use lowercase for robust comparison
    case 'en cours': return 'badge-warning';
    case 'a clôturée': return 'badge-info'; // Ensure this matches the value used in the select dropdown
    case 'terminée': return 'badge-success';
    case 'demande de rma': return 'badge-secondary';
    default: return 'badge-ghost';
  }
};

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, onClose, sectorId, onTicketUpdated }) => {
  const [newComment, setNewComment] = useState<string>('');
  // Use the helper function to set the initial status
  const [currentStatus, setCurrentStatus] = useState<string>(''); // Initialize empty, set in useEffect
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null); // For summary/solution updates

  // --- AI Summary ---
  const summaryPrompt = useMemo(() => {
    if (!ticket?.demandeSAP || ticket?.summary) return ''; // Don't generate if no text or already exists
    return `Résume ce texte en 1 ou 2 phrases maximum: ${ticket.demandeSAP}`;
  }, [ticket?.id, ticket?.demandeSAP, ticket?.summary]); // Depend on ticket ID, text, and existing summary

  const {
    summary: generatedSummary,
    isLoading: isSummaryLoading,
    error: summaryError
  } = useGeminiSummary(summaryPrompt);

  // --- AI Solution ---
  const solutionPrompt = useMemo(() => {
    if (!ticket?.demandeSAP || ticket?.solution) return ''; // Don't generate if no text or already exists
    return `Propose une solution concise (1-2 phrases) pour ce problème: ${ticket.demandeSAP}`;
  }, [ticket?.id, ticket?.demandeSAP, ticket?.solution]); // Depend on ticket ID, text, and existing solution

  const {
    summary: generatedSolution,
    isLoading: isSolutionLoading,
    error: solutionError
  } = useGeminiSummary(solutionPrompt);

  // --- Effects ---

  // Initialize/Update status when ticket changes
  useEffect(() => {
    if (ticket) {
      setCurrentStatus(getInitialStatus(ticket));
    } else {
      setCurrentStatus(''); // Reset if no ticket
    }
  }, [ticket]); // Re-run only when the ticket object itself changes

  // Save generated summary to Firebase
  useEffect(() => {
    const saveSummary = async () => {
      if (generatedSummary && sectorId && ticket?.id && !ticket.summary) { // Only save if newly generated
        setUpdateError(null);
        try {
          console.log("Attempting to save generated summary:", generatedSummary);
          await updateTicket(sectorId, ticket.id, { summary: generatedSummary });
          onTicketUpdated(); // Refresh list to show updated data
        } catch (error: any) {
          console.error("Error saving summary:", error);
          setUpdateError(`Erreur sauvegarde résumé: ${error.message}`);
        }
      }
    };
    saveSummary();
  }, [generatedSummary, sectorId, ticket?.id, ticket?.summary, onTicketUpdated]); // Add ticket.summary dependency

  // Save generated solution to Firebase
  useEffect(() => {
    const saveSolution = async () => {
      if (generatedSolution && sectorId && ticket?.id && !ticket.solution) { // Only save if newly generated
        setUpdateError(null);
        try {
          console.log("Attempting to save generated solution:", generatedSolution);
          await updateTicket(sectorId, ticket.id, { solution: generatedSolution });
          onTicketUpdated(); // Refresh list to show updated data
        } catch (error: any) {
          console.error("Error saving solution:", error);
          setUpdateError(`Erreur sauvegarde solution: ${error.message}`);
        }
      }
    };
    saveSolution();
  }, [generatedSolution, sectorId, ticket?.id, ticket?.solution, onTicketUpdated]); // Add ticket.solution dependency


  // --- Handlers ---

  const handleAddComment = async () => {
    if (newComment.trim() && sectorId && ticket?.id) {
      setCommentError(null);
      const updatedComments = [...(ticket.commentaires || []), newComment];
      try {
        await updateTicket(sectorId, ticket.id, { commentaires: updatedComments });
        setNewComment(''); // Clear input
        onTicketUpdated(); // Refresh list
      } catch (error: any) {
        setCommentError(`Erreur ajout commentaire: ${error.message}`);
      }
    }
  };

  const handleStatusChange = async () => {
    if (sectorId && ticket?.id && currentStatus) {
      setIsUpdatingStatus(true);
      setStatusUpdateError(null);
      try {
        await updateTicket(sectorId, ticket.id, { statut: currentStatus });
        setIsUpdatingStatus(false);
        onTicketUpdated(); // Refresh list
      } catch (error: any) {
        setStatusUpdateError(`Erreur MàJ statut: ${error.message}`);
        setIsUpdatingStatus(false);
      }
    }
  };

  if (!ticket) {
    return null;
  }

  // Determine what to display (existing or newly generated)
  const displaySummary = ticket?.summary || generatedSummary;
  const displaySolution = ticket?.solution || generatedSolution;


  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl"> {/* Wider modal */}
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg">{ticket.raisonSociale} - Ticket SAP {ticket.numeroSAP}</h3>

        {/* Ticket Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <p><b>Code Client:</b> {ticket.codeClient || 'N/A'}</p>
          <p><b>Téléphone:</b> {ticket.telephone || 'N/A'}</p>
          <p className="md:col-span-2"><b>Adresse:</b> {ticket.adresse || 'N/A'}</p>
          <p><b>Date:</b> {ticket.date || 'N/A'}</p>
          <div className="flex items-center gap-2">
             <b>Statut:</b> <span className={`badge ${getStatusBadgeClass(currentStatus)}`}>{currentStatus}</span>
          </div>
        </div>
        <hr className="my-4"/>

        {/* AI Summary Section */}
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">Résumé IA</h4>
          {isSummaryLoading && <span className="loading loading-dots loading-sm"></span>}
          {summaryError && !displaySummary && <p className="text-error text-sm">Erreur résumé: {summaryError}</p>}
          {displaySummary ? (
            <div className="prose prose-sm max-w-none"><ReactMarkdown>{displaySummary}</ReactMarkdown></div>
          ) : !isSummaryLoading && !summaryError ? (
            <p className="text-sm text-gray-500 italic">Génération du résumé...</p>
          ) : null}
           {updateError && updateError.includes("résumé") && <p className="text-error text-sm mt-1">{updateError}</p>}
        </div>

        {/* AI Solution Section */}
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">Solution Proposée IA</h4>
          {isSolutionLoading && <span className="loading loading-dots loading-sm"></span>}
          {solutionError && !displaySolution && <p className="text-error text-sm">Erreur solution: {solutionError}</p>}
          {displaySolution ? (
            <div className="prose prose-sm max-w-none"><ReactMarkdown>{displaySolution}</ReactMarkdown></div>
          ) : !isSolutionLoading && !solutionError ? (
            <p className="text-sm text-gray-500 italic">Génération de la solution...</p>
          ) : null}
           {updateError && updateError.includes("solution") && <p className="text-error text-sm mt-1">{updateError}</p>}
        </div>
        <hr className="my-4"/>

        {/* Original Request */}
         <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-md">Voir la demande SAP originale</summary>
            <div className="mt-2 p-2 border rounded bg-base-200 text-sm max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">{ticket.demandeSAP || 'N/A'}</pre>
            </div>
        </details>
        <hr className="my-4"/>


        {/* Status Update Section */}
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">Modifier le Statut</h4>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              disabled={isUpdatingStatus}
            >
              {/* Add "Demande de RMA" as an option */}
              <option value="Demande de RMA">Demande de RMA</option>
              <option value="En cours">En cours</option>
              <option value="A Clôturée">A Clôturée</option> {/* Ensure this value matches getStatusBadgeClass */}
              <option value="Terminée">Terminée</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleStatusChange} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <span className="loading loading-spinner loading-xs"></span> : 'Mettre à jour'}
            </button>
          </div>
          {statusUpdateError && <p className="text-error text-sm mt-1">{statusUpdateError}</p>}
        </div>

        {/* Comments Section */}
        <div>
          <h4 className="text-md font-semibold mb-2">Commentaires</h4>
          <div className="max-h-40 overflow-y-auto mb-2 border rounded p-2 bg-base-200">
            {ticket.commentaires && ticket.commentaires.length > 0 ? (
              <ul className="list-disc list-inside text-sm">
                {ticket.commentaires.map((commentaire: string, index: number) => (
                  <li key={index}>{commentaire}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">Aucun commentaire.</p>
            )}
          </div>
          <textarea
            placeholder="Ajouter un commentaire..."
            className="textarea textarea-bordered w-full text-sm"
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          ></textarea>
          <button className="btn btn-secondary btn-sm mt-2" onClick={handleAddComment}>Ajouter</button>
          {commentError && <p className="text-error text-sm mt-1">{commentError}</p>}
        </div>

        {/* Close button at the bottom */}
        <div className="modal-action mt-6">
          <button onClick={onClose} className="btn">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
