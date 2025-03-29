import React, { useState, useEffect } from 'react';
import EnvoiList from '../../components/Envois/EnvoiList';
import EnvoiDetails from '../../components/Envois/EnvoiDetails';
import { fetchSectors } from '../../services/firebaseService'; // Assuming fetchSectors can be reused or adapted

// Define the Envoi type matching the data structure
interface Envoi {
  id: string;
  articleNom: string;
  bt: string;
  codeClient: string;
  nomClient: string;
  secteur: string;
  statutExpedition: string;
  trackingLink?: string;
}

// Define Sector type (can be reused from SAPPage if available)
interface Sector {
  id: string;
  // Add other properties if needed, e.g., name
}

const EnvoisPage: React.FC = () => {
  const [selectedEnvoi, setSelectedEnvoi] = useState<Envoi | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>(''); // Store selected sector ID
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [errorSectors, setErrorSectors] = useState<string | null>(null);

  useEffect(() => {
    const loadSectors = async () => {
      setLoadingSectors(true);
      setErrorSectors(null);
      try {
        // Fetch sectors - Assuming 'CHR', 'HACCP', 'Kezia', 'Tabac' are the relevant sectors for Envois too
        // If Envois can have *any* sector, this might need adjustment or removal
        const fetchedSectors = await fetchSectors(); // Reusing fetchSectors
        setSectors(fetchedSectors as Sector[]);
      } catch (err: any) {
        setErrorSectors(`Erreur lors de la récupération des secteurs: ${err.message}`);
        setSectors([]);
      } finally {
        setLoadingSectors(false);
      }
    };
    loadSectors();
  }, []);

  const handleEnvoiSelect = (envoi: Envoi) => {
    setSelectedEnvoi(envoi);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEnvoi(null);
  };

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSector(event.target.value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Suivi des Envois</h2>
        <div>
          <label htmlFor="sector-select" className="mr-2">Filtrer par Secteur:</label>
          <select
            id="sector-select"
            className="select select-bordered select-sm"
            value={selectedSector}
            onChange={handleSectorChange}
            disabled={loadingSectors || !!errorSectors}
          >
            <option value="">Tous les secteurs</option>
            {loadingSectors && <option value="" disabled>Chargement...</option>}
            {errorSectors && <option value="" disabled>Erreur</option>}
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.id} {/* Assuming sector ID is the name */}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorSectors && (
         <div className="alert alert-warning">
            <span>Erreur chargement secteurs: {errorSectors}</span>
         </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          {/* Pass selectedSector to EnvoiList */}
          <EnvoiList
            selectedSector={selectedSector}
            onEnvoiSelect={handleEnvoiSelect}
          />
        </div>
        {/* Modal for details */}
        {isModalOpen && <EnvoiDetails envoi={selectedEnvoi} onClose={handleCloseModal} />}
      </div>
    </div>
  );
};

export default EnvoisPage;
