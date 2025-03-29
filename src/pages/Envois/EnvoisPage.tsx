import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { listenToCollection } from '../../services/firebaseService'; // Keep for unique secteurs/statuses if needed
import EnvoiList from '../../components/Envois/EnvoiList';
import EnvoiDetails from '../../components/Envois/EnvoiDetails';
import { FaFilter, FaTimes } from 'react-icons/fa';

// Define the structure of an Envoi object (can be simplified if only used for details)
interface Envoi {
  id: string;
  nomClient?: string;
  numeroTracking?: string; // Keep if used in details
  statut?: string; // Keep if used in details or filters
  secteur?: string; // Keep for filtering
  // Add other relevant fields needed for EnvoiDetails
  [key: string]: any; // Allow other properties
}

const EnvoisPage: React.FC = () => {
  // State for selected envoi and details modal
  const [selectedEnvoi, setSelectedEnvoi] = useState<Envoi | null>(null);

  // State for filters
  const [searchTermClient, setSearchTermClient] = useState(''); // Not currently used by EnvoiList
  const [searchTermTracking, setSearchTermTracking] = useState(''); // Not currently used by EnvoiList
  const [filterStatut, setFilterStatut] = useState(''); // Not currently used by EnvoiList
  const [filterSecteur, setFilterSecteur] = useState(''); // Passed to EnvoiList as selectedSector
  const [showFilters, setShowFilters] = useState(false);

  // State for filter dropdown options (optional, could fetch separately if needed)
  const [allEnvoisForFilters, setAllEnvoisForFilters] = useState<Envoi[]>([]);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);

  // Fetch all envois *once* just to populate filter dropdowns
  useEffect(() => {
    setLoadingFilters(true);
    const unsubscribe = listenToCollection('Envoi', (allEnvois) => {
      setAllEnvoisForFilters(allEnvois);
      setLoadingFilters(false);
    }, (err) => {
      console.error("Error fetching envois for filters:", err);
      setLoadingFilters(false);
      // Optionally set an error state for filters
    });
    return () => unsubscribe();
  }, []);


  const handleSelectEnvoi = useCallback((envoi: Envoi) => {
    setSelectedEnvoi(envoi);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedEnvoi(null);
  }, []);

  // Callback if EnvoiDetails needs to trigger a refresh (implement if needed)
  const handleEnvoiUpdated = useCallback(() => {
    // Currently EnvoiDetails doesn't modify data, but if it did,
    // we might need to refresh the filter options or the list.
    // For now, just log it.
    console.log("Envoi details potentially updated (callback called).");
    // Example: Force refresh filter options if status could change
    // setLoadingFilters(true); // Trigger refetch of filter data
  }, []);


  // Get unique statuses and secteurs for filter dropdowns from the fetched data
   const uniqueStatuses = useMemo(() => {
    if (loadingFilters) return [''];
    // Assuming status field is 'statutExpedition' based on EnvoiList
    const statuses = new Set(allEnvoisForFilters.map(envoi => envoi.statutExpedition).filter(Boolean));
    return ['', ...Array.from(statuses).sort()]; // Add empty option for 'All' and sort
  }, [allEnvoisForFilters, loadingFilters]);

  const uniqueSecteurs = useMemo(() => {
    if (loadingFilters) return [''];
    const secteurs = new Set(allEnvoisForFilters.map(envoi => envoi.secteur).filter(Boolean));
    return ['', ...Array.from(secteurs).sort()]; // Add empty option for 'All' and sort
  }, [allEnvoisForFilters, loadingFilters]);


  const clearFilters = () => {
    setSearchTermClient('');
    setSearchTermTracking('');
    setFilterStatut('');
    setFilterSecteur('');
  };

  // Determine if any filter is active
  const filtersActive = searchTermClient || searchTermTracking || filterStatut || filterSecteur;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]"> {/* Adjusted height */}
        {/* Left Panel: Filters and Envoi List */}
        {/* This panel is always visible */}
        <div className="flex flex-col w-full lg:w-1/3"> {/* Ensure this flex-col container works correctly */}
          {/* Filter Controls */}
          <div className="mb-4 card bg-base-100 shadow p-4 shrink-0"> {/* Added shrink-0 */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Filtres Envois</h2>
              <div className="flex items-center gap-2">
                   <button
                      className={`btn btn-ghost btn-sm text-error ${!filtersActive ? 'hidden' : ''}`}
                      onClick={clearFilters}
                      title="Effacer les filtres"
                      >
                      <FaTimes /> Effacer
                  </button>
                  <button
                  className="btn btn-ghost btn-sm lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                  >
                  <FaFilter /> {showFilters ? 'Masquer' : 'Afficher'}
                  </button>
              </div>
            </div>
            {/* Filters are always visible on large screens (lg:block), toggle on small */}
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-2`}>
              {/* Removed client/tracking filters as they don't affect the list currently */}
              {/*
              <input
                type="text"
                placeholder="Filtrer par Nom Client..."
                className="input input-bordered w-full"
                value={searchTermClient}
                onChange={(e) => setSearchTermClient(e.target.value)}
                disabled // Disable until implemented
              />
              <input
                type="text"
                placeholder="Filtrer par N° Tracking..."
                className="input input-bordered w-full"
                value={searchTermTracking}
                onChange={(e) => setSearchTermTracking(e.target.value)}
                disabled // Disable until implemented
              />
               <select
                className="select select-bordered w-full"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                disabled={loadingFilters} // Disable while loading options
              >
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === '' ? 'Tous les statuts' : status}
                  </option>
                ))}
              </select>
              */}
               <p className="text-xs text-warning">Note: Seul le filtre secteur est actif pour la liste.</p>
              <select
                className="select select-bordered w-full"
                value={filterSecteur}
                onChange={(e) => setFilterSecteur(e.target.value)}
                disabled={loadingFilters} // Disable while loading options
              >
                {uniqueSecteurs.map(secteur => (
                  <option key={secteur} value={secteur}>
                    {secteur === '' ? 'Tous les secteurs' : secteur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Envoi List Area */}
          {/* Added min-h-0 to help flexbox calculate height for overflow */}
          <div className="flex-grow overflow-y-auto card bg-base-100 shadow p-4 w-full min-h-0">
            {/* Pass the correct props */}
            <EnvoiList
              selectedSector={filterSecteur}
              onEnvoiSelect={handleSelectEnvoi}
              // Pass selectedEnvoiId if highlighting is needed in EnvoiList
              // selectedEnvoiId={selectedEnvoi?.id}
            />
          </div>
        </div>

        {/* Right Panel: Placeholder ONLY */}
        {/* This panel is hidden on small screens, visible on large */}
        <div className="w-full lg:w-2/3 hidden lg:flex justify-center items-center h-full text-gray-500 card bg-base-100 shadow p-4">
          Sélectionnez un envoi pour voir les détails.
        </div>
      </div>

       {/* Render EnvoiDetails as a Modal OUTSIDE the main layout */}
       {selectedEnvoi && (
        <EnvoiDetails
          envoi={selectedEnvoi}
          onClose={handleCloseDetails}
          // Pass update callback if needed in the future
          // onEnvoiUpdated={handleEnvoiUpdated}
        />
      )}
    </>
  );
};

export default EnvoisPage;
