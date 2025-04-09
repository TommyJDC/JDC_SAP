import React, { useState, useEffect, useMemo } from 'react';
    import useGeminiSummary from '../../hooks/useGeminiSummary'; // Corrected import path
    import { updateTicket } from '../../services/firebaseService';
    import ReactMarkdown from 'react-markdown';
    import { FaSpinner } from 'react-icons/fa'; // Import spinner icon and phone icon

    interface TicketDetailsProps {
      ticket: any | null;
      onClose: () => void;
      sectorId: string; // Sector ID is crucial for updating the correct document
      onTicketUpdated: () => void; // Callback to notify parent of updates
    }

    // Function to determine the initial status (Keep as is)
    const getInitialStatus = (ticket: any): string => {
      if (ticket?.demandeSAP?.toLowerCase().includes('demande de rma')) {
        return 'Demande de RMA';
      }
      // Default to 'Nouveau' if status is missing and not RMA
      if (!ticket?.statut && !ticket?.demandeSAP?.toLowerCase().includes('demande de rma')) {
          return 'Nouveau';
      }
      return ticket?.statut || 'Nouveau'; // Fallback to Nouveau if still undefined
    };


    // Define badge classes based on status (consistent with TicketList)
    const getStatusBadgeClass = (status: string): string => {
      switch (status?.toLowerCase()) {
        case 'nouveau': return 'badge-info';
        case 'en cours': return 'badge-primary';
        case 'terminée': return 'badge-success';
        case 'annulé': return 'badge-error';
        case 'demande de rma': return 'badge-warning';
        case 'a clôturée': return 'badge-accent'; // Match TicketList style
        default: return 'badge-ghost';
      }
    };

    const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, onClose, sectorId, onTicketUpdated }) => {
      const [newComment, setNewComment] = useState<string>('');
      const [currentStatus, setCurrentStatus] = useState<string>('');
      const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
      const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
      const [commentError, setCommentError] = useState<string | null>(null);
      const [updateError, setUpdateError] = useState<string | null>(null);
      const [isAddingComment, setIsAddingComment] = useState<boolean>(false);


      // --- AI Summary ---
      // Generate summary only if demandeSAP exists and summary is missing
      const summaryPrompt = useMemo(() => {
        if (!ticket?.demandeSAP || ticket?.summary) return '';
        return `Résume ce texte en 1 ou 2 phrases maximum, en français: ${ticket.demandeSAP}`;
      }, [ticket?.id, ticket?.demandeSAP, ticket?.summary]); // Depend on ticket ID, text, and existing summary

      const {
        summary: generatedSummary,
        isLoading: isSummaryLoading,
        error: summaryError,
        generateSummary: triggerSummaryGeneration // Get the trigger function
      } = useGeminiSummary(''); // Initialize with empty prompt

      // --- AI Solution ---
      // Generate solution only if demandeSAP exists and solution is missing
      const solutionPrompt = useMemo(() => {
        if (!ticket?.demandeSAP || ticket?.solution) return '';
        return `Propose une solution concise (1-2 phrases), en français, pour ce problème: ${ticket.demandeSAP}`;
      }, [ticket?.id, ticket?.demandeSAP, ticket?.solution]); // Depend on ticket ID, text, and existing solution

      const {
        summary: generatedSolution,
        isLoading: isSolutionLoading,
        error: solutionError,
         generateSummary: triggerSolutionGeneration // Get the trigger function
      } = useGeminiSummary(''); // Initialize with empty prompt


      // --- Effects ---

      // Initialize/Update status when ticket changes
      useEffect(() => {
        if (ticket) {
          setCurrentStatus(getInitialStatus(ticket));
          // Trigger AI generation only if needed when ticket loads
          if (summaryPrompt) triggerSummaryGeneration(summaryPrompt);
          if (solutionPrompt) triggerSolutionGeneration(solutionPrompt);
        } else {
          setCurrentStatus(''); // Reset if no ticket
        }
        // Clear errors when ticket changes
        setStatusUpdateError(null);
        setCommentError(null);
        setUpdateError(null);
        setNewComment('');
      }, [ticket, summaryPrompt, solutionPrompt, triggerSummaryGeneration, triggerSolutionGeneration]); // Re-run when ticket or prompts change

      // Save generated summary to Firebase when it becomes available
      useEffect(() => {
        const saveSummary = async () => {
          // Only save if summary was generated, exists, and wasn't already present on the ticket
          if (generatedSummary && sectorId && ticket?.id && !ticket.summary) {
            setUpdateError(null);
            try {
              console.log("Attempting to save generated summary:", generatedSummary);
              await updateTicket(sectorId, ticket.id, { summary: generatedSummary });
              onTicketUpdated(); // Notify parent (listeners should also pick it up)
            } catch (error: any) {
              console.error("Error saving summary:", error);
              setUpdateError(`Erreur sauvegarde résumé: ${error.message}`);
            }
          }
        };
        saveSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [generatedSummary, sectorId, ticket?.id]); // Depend only on generatedSummary and identifiers

      // Save generated solution to Firebase when it becomes available
      useEffect(() => {
        const saveSolution = async () => {
          // Only save if solution was generated, exists, and wasn't already present on the ticket
          if (generatedSolution && sectorId && ticket?.id && !ticket.solution) {
            setUpdateError(null);
            try {
              console.log("Attempting to save generated solution:", generatedSolution);
              await updateTicket(sectorId, ticket.id, { solution: generatedSolution });
              onTicketUpdated(); // Notify parent
            } catch (error: any) {
              console.error("Error saving solution:", error);
              setUpdateError(`Erreur sauvegarde solution: ${error.message}`);
            }
          }
        };
        saveSolution();
         // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [generatedSolution, sectorId, ticket?.id]); // Depend only on generatedSolution and identifiers


      // --- Handlers ---

      const handleAddComment = async () => {
        if (newComment.trim() && sectorId && ticket?.id) {
          setIsAddingComment(true);
          setCommentError(null);
          // Prepend new comment for chronological order (newest first)
          const updatedComments = [newComment, ...(ticket.commentaires || [])];
          try {
            await updateTicket(sectorId, ticket.id, { commentaires: updatedComments });
            setNewComment('');
            onTicketUpdated();
          } catch (error: any) {
            setCommentError(`Erreur ajout commentaire: ${error.message}`);
          } finally {
            setIsAddingComment(false);
          }
        }
      };

      const handleStatusChange = async () => {
        if (sectorId && ticket?.id && currentStatus && currentStatus !== ticket?.statut) { // Only update if status changed
          setIsUpdatingStatus(true);
          setStatusUpdateError(null);
          try {
            await updateTicket(sectorId, ticket.id, { statut: currentStatus });
            onTicketUpdated();
          } catch (error: any) {
            setStatusUpdateError(`Erreur MàJ statut: ${error.message}`);
            // Revert optimistic update on error
            setCurrentStatus(getInitialStatus(ticket));
          } finally {
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
          <div className="modal-box w-11/12 max-w-3xl relative bg-jdc-dark-gray text-jdc-white">
            <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
                aria-label="Fermer"
            >
                ✕
            </button>

            <h3 className="font-bold text-xl mb-1">{ticket.raisonSociale || 'Client Inconnu'}</h3>
            <p className="text-sm text-gray-400 mb-4">Ticket SAP: {ticket.numeroSAP || 'N/A'}</p>

            {/* Ticket Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 py-4 text-sm border-t border-b border-gray-700">
              <p><b>Code Client:</b> {ticket.codeClient || 'N/A'}</p>
              <p><b>Téléphone:</b> {ticket.telephone || 'N/A'}</p>
              <p className="md:col-span-2"><b>Adresse:</b> {ticket.adresse || 'N/A'}</p>
              <p><b>Date Création:</b> {ticket.dateCreation ? new Date(ticket.dateCreation).toLocaleDateString() : 'N/A'}</p>
              <p><b>Secteur:</b> <span className="badge badge-neutral">{ticket.secteur || 'N/A'}</span></p>
               {/* Display Salesperson if available */}
               {ticket.salesperson && (
                 <p><b>Commercial:</b> {ticket.salesperson}</p>
               )}
            </div>


            {/* Status Update Section */}
            <div className="my-4">
              <label htmlFor="ticket-status-select" className="block text-sm font-medium text-gray-300 mb-1">Statut Actuel</label>
              <div className="flex items-center gap-2">
                <select
                  id="ticket-status-select"
                  className="select select-bordered select-sm w-full max-w-xs bg-jdc-gray"
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  disabled={isUpdatingStatus}
                >
                  <option value="Nouveau">Nouveau</option>
                  <option value="Demande de RMA">Demande de RMA</option>
                  <option value="En cours">En cours</option>
                  <option value="A Clôturée">A Clôturée</option>
                  <option value="Terminée">Terminée</option>
                  <option value="Annulé">Annulé</option>
                </select>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleStatusChange}
                    disabled={isUpdatingStatus || currentStatus === ticket?.statut} // Disable if not changed or updating
                >
                  {isUpdatingStatus ? <FaSpinner className="animate-spin" /> : 'Mettre à jour'}
                </button>
                 {/* Display current status as badge */}
                 <span className={`badge ${getStatusBadgeClass(currentStatus)} ml-auto`}>{currentStatus}</span>
              </div>
              {statusUpdateError && <p className="text-error text-xs mt-1">{statusUpdateError}</p>}
            </div>
            <hr className="my-3 border-gray-700"/>

            {/* AI Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* AI Summary Section */}
                <div>
                  <h4 className="text-md font-semibold mb-1 text-blue-300">Résumé IA</h4>
                  {isSummaryLoading && <span className="loading loading-dots loading-sm"></span>}
                  {summaryError && !displaySummary && <p className="text-error text-xs">Erreur résumé: {summaryError}</p>}
                  {displaySummary ? (
                    <div className="prose prose-sm max-w-none text-gray-300"><ReactMarkdown>{displaySummary}</ReactMarkdown></div>
                  ) : !isSummaryLoading && !summaryError ? (
                    <p className="text-xs text-gray-500 italic">Aucun résumé généré.</p>
                  ) : null}
                   {updateError && updateError.includes("résumé") && <p className="text-error text-xs mt-1">{updateError}</p>}
                </div>

                {/* AI Solution Section */}
                <div>
                  <h4 className="text-md font-semibold mb-1 text-green-300">Solution Proposée IA</h4>
                  {isSolutionLoading && <span className="loading loading-dots loading-sm"></span>}
                  {solutionError && !displaySolution && <p className="text-error text-xs">Erreur solution: {solutionError}</p>}
                  {displaySolution ? (
                    <div className="prose prose-sm max-w-none text-gray-300"><ReactMarkdown>{displaySolution}</ReactMarkdown></div>
                  ) : !isSolutionLoading && !solutionError ? (
                    <p className="text-xs text-gray-500 italic">Aucune solution générée.</p>
                  ) : null}
                   {updateError && updateError.includes("solution") && <p className="text-error text-xs mt-1">{updateError}</p>}
                </div>
            </div>
            <hr className="my-3 border-gray-700"/>


            {/* Original Request */}
             <details className="mb-3 text-sm">
                <summary className="cursor-pointer font-medium text-gray-400 hover:text-jdc-white">Voir la demande SAP originale</summary>
                <div className="mt-2 p-3 border border-gray-600 rounded bg-jdc-gray text-xs max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words font-mono">{ticket.demandeSAP || 'N/A'}</pre>
                </div>
            </details>
            <hr className="my-3 border-gray-700"/>


            {/* Comments Section */}
            <div>
              <h4 className="text-md font-semibold mb-2">Commentaires</h4>
              <div className="max-h-40 overflow-y-auto mb-3 border border-gray-600 rounded p-3 bg-jdc-gray text-sm space-y-2">
                {ticket.commentaires && ticket.commentaires.length > 0 ? (
                  ticket.commentaires.map((commentaire: string, index: number) => (
                    <p key={index} className="border-b border-gray-700 pb-1 mb-1">{commentaire}</p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun commentaire.</p>
                )}
              </div>
              <textarea
                placeholder="Ajouter un commentaire..."
                className="textarea textarea-bordered w-full text-sm bg-jdc-gray"
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isAddingComment}
              ></textarea>
               <button
                  className="btn btn-secondary btn-sm mt-2"
                  onClick={handleAddComment}
                  disabled={isAddingComment || !newComment.trim()}
                >
                  {isAddingComment ? <FaSpinner className="animate-spin" /> : 'Ajouter Commentaire'}
                </button>
              {commentError && <p className="text-error text-xs mt-1">{commentError}</p>}
            </div>
          </div>
           {/* Click outside to close */}
           <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
           </form>
        </div>
      );
    };

    export default TicketDetails;
