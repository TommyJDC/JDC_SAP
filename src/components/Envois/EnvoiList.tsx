import React, { useState, useEffect, useMemo } from 'react';
import { fetchEnvois } from '../../services/firebaseService';

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

  useEffect(() => {
    const loadEnvois = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedEnvois = await fetchEnvois();
        setAllEnvois(fetchedEnvois as Envoi[]);
        setError(null);
      } catch (err: any) {
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
      return allEnvois; // No sector selected, show all
    }
    return allEnvois.filter(envoi => envoi.secteur === selectedSector);
  }, [allEnvois, selectedSector]);

  // Group filtered envois by client name
  const groupedEnvois = useMemo(() => {
    const grouped = groupEnvoisByClient(filteredEnvois);
    // Optional: Sort client groups by name
    // return Object.entries(grouped).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    return grouped;
  }, [filteredEnvois]);

  if (loading) {
    return <div className="flex justify-center items-center p-4"><span className="loading loading-dots loading-lg"></span></div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{error}</span>
      </div>
    );
  }

  const getStatusClassName = (statut: string) => {
    switch (statut?.toLowerCase()) {
      case 'oui': return 'badge-success'; // Use DaisyUI badge colors
      case 'non': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const clientNames = Object.keys(groupedEnvois).sort(); // Get sorted client names

  return (
    <div>
      {filteredEnvois.length === 0 && !loading && !error ? (
        <p className="text-center p-4">Aucun envoi trouvé {selectedSector ? `pour le secteur ${selectedSector}` : ''}.</p>
      ) : (
        clientNames.map((clientName) => (
          <div key={clientName} className="mb-6 p-4 border rounded-lg shadow-sm bg-base-200">
            <h3 className="text-xl font-semibold mb-3 sticky top-0 bg-base-200 py-2 z-10">{clientName} ({groupedEnvois[clientName].length})</h3>
            <div className="space-y-4">
              {groupedEnvois[clientName].map((envoi) => (
                <div
                  key={envoi.id}
                  onClick={() => onEnvoiSelect(envoi)}
                  className="card w-full bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="card-body p-4">
                    {/* Removed card-title for client name as it's now a group header */}
                    <p><b>Article:</b> {envoi.articleNom}</p>
                    <p><b>BT:</b> {envoi.bt}</p>
                    <p><b>Code Client:</b> {envoi.codeClient}</p>
                    {/* Sector is now implicit via filter or shown if 'Tous' is selected */}
                    {!selectedSector && <p><b>Secteur:</b> {envoi.secteur}</p>}
                    <div className="card-actions justify-end items-center mt-2">
                      {envoi.trackingLink && (
                        <a
                          href={envoi.trackingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline btn-info"
                          onClick={(e) => e.stopPropagation()} // Prevent card click
                        >
                          Suivre Colis
                        </a>
                      )}
                      <div className={`badge ${getStatusClassName(envoi.statutExpedition)}`}>
                        Expédié: {envoi.statutExpedition || 'N/A'}
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
