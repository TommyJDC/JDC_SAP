import React, { useState, useEffect, useMemo } from 'react';
import { fetchEnvois, deleteMultipleEnvois } from '../../services/firebaseService';
import { getAuth } from 'firebase/auth'; // Import getAuth

interface Envoi {
  id: string;
  articleNom: string;
  bt: string;
  codeClient: string;
  nomClient: string;
  secteur: string;
  statutExpedition: string;
  trackingLink?: string; // Optional tracking link
}

interface EnvoiListProps {
  selectedSector: string; // Receive selected sector ID
  onEnvoiSelect: (envoi: Envoi) => void;
}

// Helper function to group envois by nomClient
const groupEnvoisByClient = (envois: Envoi[]): { [clientName: string]: Envoi[] } => {
  return envois.reduce((acc, envoi) => {
    const clientName = envoi.nomClient || 'Client Inconnu'; // Handle cases with no client name
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(envoi);
    // Optional: Sort envois within each client group, e.g., by BT
    // acc[clientName].sort((a, b) => a.bt.localeCompare(b.bt));
    return acc;
  }, {} as { [clientName: string]: Envoi[] });
};


const EnvoiList: React.FC<EnvoiListProps> = ({ selectedSector, onEnvoiSelect }) => {
  const [allEnvois, setAllEnvois] = useState<Envoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null); // Store client name for confirmation

  useEffect(() => {
    const loadEnvois = async () => {
      console.log("[EnvoiList] Loading envois...");
      setLoading(true);
      setError(null);
      try {
        const fetchedEnvois = await fetchEnvois();
        setAllEnvois(fetchedEnvois as Envoi[]);
        console.log(`[EnvoiList] Successfully loaded ${fetchedEnvois.length} envois.`);
        setError(null);
      } catch (err: any) {
        console.error("[EnvoiList] Error loading envois:", err);
        setError(`Erreur lors de la récupération des envois: ${err.message}`);
        setAllEnvois([]);
      } finally {
        setLoading(false);
      }
    };

    loadEnvois();
    // No dependency array needed here if we fetch all once and filter client-side
  }, []);

  // Filter envois based on selectedSector
  const filteredEnvois = useMemo(() => {
    if (!selectedSector) {
      console.log("[EnvoiList] No sector selected, showing all envois.");
      return allEnvois; // No sector selected, show all
    }
    console.log(`[EnvoiList] Filtering envois for sector: ${selectedSector}`);
    const filtered = allEnvois.filter(envoi => envoi.secteur === selectedSector);
    console.log(`[EnvoiList] Found ${filtered.length} envois for sector ${selectedSector}.`);
    return filtered;
  }, [allEnvois, selectedSector]);

  // Group filtered envois by client name
  const groupedEnvois = useMemo(() => {
    console.log("[EnvoiList] Grouping filtered envois by client name.");
    const grouped = groupEnvoisByClient(filteredEnvois);
    // Optional: Sort client groups by name
    // return Object.entries(grouped).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    console.log(`[EnvoiList] Grouped into ${Object.keys(grouped).length} clients.`);
    return grouped;
  }, [filteredEnvois]);

  // Handle initiating client deletion
  const handleDeleteClient = (clientName: string) => {
    console.log(`[EnvoiList] Initiating delete for client: ${clientName}`);
    setDeleteConfirmation(clientName); // Ask for confirmation
  };

  // Confirm deletion
  const confirmDeleteClient = async (clientName: string, envoisToDelete: Envoi[]) => {
    const envoiIds = envoisToDelete.map(envoi => envoi.id);
    console.log(`[EnvoiList] Confirming deletion for client: ${clientName}, Envoi IDs: ${envoiIds.join(', ')}`);

    // Check auth status before attempting delete
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("[EnvoiList] Delete cancelled: User is not authenticated.");
        setError("Erreur: Vous devez être connecté pour supprimer des envois.");
        setDeleteConfirmation(null); // Close confirmation dialog
        return;
    }
    console.log(`[EnvoiList] User authenticated: ${currentUser.uid}. Proceeding with delete.`);

    setIsDeleting(true);
    setError(null); // Clear previous errors
    try {
      await deleteMultipleEnvois(envoiIds);
      console.log(`[EnvoiList] Successfully requested deletion for ${envoiIds.length} envois for client ${clientName}.`);

      // Update local state immediately to remove deleted envois from UI
      setAllEnvois(prev => prev.filter(envoi => !envoiIds.includes(envoi.id)));
      console.log(`[EnvoiList] Local state updated after deletion for client ${clientName}.`);

      // Optionally show a success message (alert or toast)
      // alert(`Les envois pour ${clientName} ont été supprimés avec succès.`);

    } catch (err: any) {
      console.error(`[EnvoiList] Error deleting envois for client ${clientName}:`, err);
      // Display the specific error message from firebaseService
      setError(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
      // Optionally, reload envois if deletion failed partially or state is uncertain
      // loadEnvois();
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation(null); // Close confirmation dialog regardless of outcome
    }
  };

  // Cancel deletion
  const cancelDeleteClient = () => {
    console.log("[EnvoiList] Delete cancelled by user.");
    setDeleteConfirmation(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center p-4"><span className="loading loading-dots loading-lg"></span></div>;
  }

  // Display general error if loading failed
  if (error && !deleteConfirmation) { // Only show general error if not in confirmation step
    return (
      <div className="alert alert-error shadow-lg">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const getStatusClassName = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'oui': return 'badge-success'; // Use DaisyUI badge colors
      case 'non': return 'badge-error';
      default: return 'badge-ghost'; // Neutral for other statuses
    }
  };

  const clientNames = Object.keys(groupedEnvois).sort(); // Get sorted client names for consistent order

  return (
    <div>
      {filteredEnvois.length === 0 && !loading ? (
        <p className="text-center p-4 text-base-content/70">Aucun envoi trouvé {selectedSector ? `pour le secteur ${selectedSector}` : ''}.</p>
      ) : (
        clientNames.map((clientName) => (
          <div key={clientName} className="mb-6 p-4 border border-base-300 rounded-lg shadow-sm bg-base-200/50">
            {/* Client Header */}
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-base-200/95 backdrop-blur-sm py-2 z-10 px-2 -mx-2 rounded-t-md"> {/* Make header sticky */}
              <h3 className="text-xl font-semibold text-base-content">{clientName} ({groupedEnvois[clientName].length})</h3>
              <button
                onClick={() => handleDeleteClient(clientName)}
                className="btn btn-sm btn-error btn-outline" // Outline style for less visual weight initially
                disabled={isDeleting || deleteConfirmation === clientName} // Disable if deleting this client or any other
              >
                {isDeleting && deleteConfirmation === clientName ? <span className="loading loading-spinner loading-xs"></span> : 'Supprimer Client'}
              </button>
            </div>

            {/* Confirmation Dialog */}
            {deleteConfirmation === clientName && (
              <div className="bg-warning/10 p-4 mb-4 rounded-lg border border-warning text-warning-content">
                <p className="font-bold mb-2">Confirmation Requise</p>
                <p className="mb-4 text-sm">Êtes-vous sûr de vouloir supprimer tous les {groupedEnvois[clientName].length} envoi(s) pour <b>{clientName}</b> ? Cette action est irréversible.</p>
                 {/* Display specific delete error here if it occurred */}
                 {error && (
                    <div className="alert alert-error text-xs p-2 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{error}</span>
                    </div>
                 )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelDeleteClient}
                    className="btn btn-sm btn-ghost"
                    disabled={isDeleting}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => confirmDeleteClient(clientName, groupedEnvois[clientName])}
                    className="btn btn-sm btn-error" // Solid error button for confirmation
                    disabled={isDeleting}
                  >
                    {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : 'Confirmer Suppression'}
                  </button>
                </div>
              </div>
            )}

            {/* Envoi Cards for the Client */}
            <div className="space-y-3"> {/* Slightly reduced spacing */}
              {groupedEnvois[clientName].map((envoi) => (
                <div
                  key={envoi.id}
                  onClick={() => onEnvoiSelect(envoi)}
                  className="card card-compact w-full bg-base-100 shadow cursor-pointer hover:shadow-md transition-shadow duration-200 ease-in-out" // Compact card
                >
                  <div className="card-body p-3"> {/* Reduced padding */}
                    {/* Removed card-title for client name as it's now a group header */}
                    <p className="text-sm"><b>Article:</b> {envoi.articleNom || 'N/A'}</p>
                    <p className="text-sm"><b>BT:</b> {envoi.bt || 'N/A'}</p>
                    <p className="text-sm"><b>Code Client:</b> {envoi.codeClient || 'N/A'}</p>
                    {/* Sector is now implicit via filter or shown if 'Tous' is selected */}
                    {!selectedSector && <p className="text-sm"><b>Secteur:</b> {envoi.secteur || 'N/A'}</p>}
                    <div className="card-actions justify-end items-center mt-2">
                      {envoi.trackingLink && (
                        <a
                          href={envoi.trackingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-outline btn-info" // Extra small button
                          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking link
                        >
                          Suivi
                        </a>
                      )}
                      <div className={`badge badge-sm ${getStatusClassName(envoi.statutExpedition)}`}> {/* Small badge */}
                        Expédié: {envoi.statutExpedition || '?'}
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

export default EnvoiList;
