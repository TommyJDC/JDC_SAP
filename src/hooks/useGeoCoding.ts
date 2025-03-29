import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { fetchGeocode, storeGeocode } from '../services/firebaseService';

// IMPORTANT: Replace with your actual OpenCageData API key
// Consider using environment variables for security: import.meta.env.VITE_OPENCAGE_API_KEY
const GEOCODING_API_KEY = 'b93a76ecb4b0439dbfe9e64c3c6aff07';
const GEOCODING_URL = 'https://api.opencagedata.com/geocode/v1/json';

// Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}


const useGeoCoding = (addresses: string[] | undefined | null) => { // Allow addresses to be undefined or null
  const [coordinates, setCoordinates] = useState<({ lat: number, lng: number } | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref to store the addresses from the *last completed* geocoding operation
  const processedAddressesRef = useRef<string[]>([]);
  // Ref to track if the initial fetch is done for the current set of addresses
  const initialFetchDoneRef = useRef<boolean>(false);
   // Ref to store the timeout ID for debouncing
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    console.log('[useGeoCoding] useEffect triggered. Input addresses:', addresses);

    // --- Enhanced Safeguard ---
    if (addresses === null || addresses === undefined || !Array.isArray(addresses)) {
        console.log('[useGeoCoding] Safeguard: Addresses is not a valid array:', addresses);
        if (coordinates.length > 0 || isLoading || error) {
            console.log('[useGeoCoding] Resetting state due to invalid addresses.');
            setCoordinates([]);
            setIsLoading(false);
            setError(null);
        }
        processedAddressesRef.current = [];
        initialFetchDoneRef.current = false; // Reset fetch status
        // Clear any pending debounce timeout
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        return; // Exit early
    }
    // --- End Enhanced Safeguard ---

    // --- Address Change Detection ---
    // Compare current input addresses with the last *processed* addresses
    const addressesChanged =
      addresses.length !== processedAddressesRef.current.length ||
      addresses.some((address, index) => address !== processedAddressesRef.current[index]);

    if (!addressesChanged && initialFetchDoneRef.current) {
      console.log('[useGeoCoding] Addresses have not changed since last successful processing, skipping.');
      return; // Skip fetching if addresses haven't changed AND initial fetch was done
    }

    console.log(`[useGeoCoding] Addresses changed or initial run. Changed: ${addressesChanged}, InitialFetchDone: ${initialFetchDoneRef.current}`);

    // --- Debounce Mechanism ---
    if (debounceTimeoutRef.current) {
        console.log('[useGeoCoding] Clearing previous debounce timeout.');
        clearTimeout(debounceTimeoutRef.current);
    }

    console.log('[useGeoCoding] Setting new debounce timeout (500ms).');
    debounceTimeoutRef.current = setTimeout(() => {
        console.log('[useGeoCoding] Debounce timeout expired. Starting fetchCoordinates.');

        // Reset fetch status before starting
        initialFetchDoneRef.current = false;

        // --- Actual Fetch Logic ---
        const fetchCoordinates = async (currentAddresses: string[]) => {
          console.log('[useGeoCoding] fetchCoordinates started.');
          setIsLoading(true);
          setError(null); // Clear previous errors before new fetch
          // Process unique, non-empty addresses from the *current* input
          const uniqueAddresses = [...new Set(currentAddresses)].filter(Boolean);
          const geocodeCache: Record<string, { lat: number, lng: number } | null> = {}; // Cache results for this run
          let encounteredError: string | null = null; // Track errors during this run

          console.log(`[useGeoCoding] Starting geocoding for ${uniqueAddresses.length} unique non-empty addresses.`);

          if (uniqueAddresses.length === 0) {
              console.log('[useGeoCoding] No unique non-empty addresses to process.');
              setCoordinates([]); // Set empty coordinates if no valid addresses
              setIsLoading(false);
              processedAddressesRef.current = [...currentAddresses]; // Store the (empty/invalid) processed addresses
              initialFetchDoneRef.current = true; // Mark fetch as done
              return;
          }


          for (const address of uniqueAddresses) {
            try {
              console.log(`[useGeoCoding] Checking DB for: "${address}"`);
              const storedGeocode = await fetchGeocode(address);
              if (storedGeocode) {
                console.log(`[useGeoCoding] DB Hit for: "${address}"`, storedGeocode);
                geocodeCache[address] = { lat: storedGeocode.latitude, lng: storedGeocode.longitude };
              } else {
                console.log(`[useGeoCoding] DB Miss for: "${address}". Fetching from API.`);
                if (!GEOCODING_API_KEY || GEOCODING_API_KEY === 'YOUR_API_KEY_HERE') {
                    console.error("[useGeoCoding] API Key is missing or placeholder!");
                    throw new Error("Clé API manquante"); // Throw specific error
                }
                try {
                  const response = await axios.get(GEOCODING_URL, {
                    params: {
                      q: address,
                      key: GEOCODING_API_KEY,
                      language: 'fr',
                      countrycode: 'fr', // Added country code bias
                      limit: 1
                    },
                    timeout: 7000 // Increased timeout
                  });

                  if (response.data.results && response.data.results.length > 0) {
                    const geometry = response.data.results[0].geometry;
                    if (geometry && typeof geometry.lat === 'number' && typeof geometry.lng === 'number') {
                        const newGeocode = { lat: geometry.lat, lng: geometry.lng };
                        geocodeCache[address] = newGeocode;
                        console.log(`[useGeoCoding] API Success for: "${address}"`, newGeocode);
                        // Store geocode in DB asynchronously (fire and forget)
                        storeGeocode(address, newGeocode.lat, newGeocode.lng)
                          .then(() => console.log(`[useGeoCoding] Stored geocode for: "${address}"`))
                          .catch(err => console.error(`[useGeoCoding] Failed to store geocode for "${address}":`, err));
                    } else {
                         geocodeCache[address] = null; // Mark as failed if geometry invalid
                         console.warn(`[useGeoCoding] No valid geometry from API for: "${address}"`, response.data.results[0]);
                    }
                  } else {
                    geocodeCache[address] = null; // Mark as failed if no results
                    console.warn(`[useGeoCoding] No results from API for: "${address}"`);
                  }
                } catch (apiError: any) {
                  geocodeCache[address] = null; // Mark as failed on API error
                  let errorMsg = `Erreur API pour "${address}"`;
                  if (apiError.message === "Clé API manquante") {
                      errorMsg = "Clé API manquante ou invalide.";
                      console.error('[useGeoCoding] API Key is missing!');
                  } else if (apiError.code === 'ECONNABORTED') {
                     errorMsg = `Timeout API pour "${address}"`;
                     console.error('[useGeoCoding] Geocoding API timeout:', apiError.message);
                  } else if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                     errorMsg = 'Clé API invalide (401/403)';
                     console.error('[useGeoCoding] Geocoding API Auth error:', apiError.message);
                  } else if (apiError.response?.status === 402) {
                    errorMsg = 'Limite API atteinte (402)';
                    console.error('[useGeoCoding] Geocoding API 402 error:', apiError.message);
                  } else if (apiError.response?.status === 429) {
                     errorMsg = 'Trop de requêtes API (429)';
                     console.error('[useGeoCoding] Geocoding API 429 error:', apiError.message);
                  } else {
                    console.error('[useGeoCoding] Geocoding API error:', apiError.message, apiError.response?.data);
                  }
                  // Set error state, accumulating errors
                  encounteredError = encounteredError ? `${encounteredError}, ${errorMsg}` : errorMsg;
                }
              }
            } catch (dbError: any) {
              geocodeCache[address] = null; // Mark as failed on DB error
              const errorMsg = `Erreur DB pour "${address}"`;
              encounteredError = encounteredError ? `${encounteredError}, ${errorMsg}` : errorMsg;
              console.error('[useGeoCoding] Geocoding DB error:', dbError.message);
            }
          }

          // Map results back to the original currentAddresses array order
          // Preserve the null/undefined structure if present in the original input
          const finalCoords = currentAddresses.map(addr => {
              if (addr === null || addr === undefined || addr === '') return null; // Handle invalid entries in original array
              return geocodeCache[addr] ?? null; // Use cached result or null if lookup failed
          });

          console.log('[useGeoCoding] Geocoding finished. Final coordinates:', finalCoords);
          setCoordinates(finalCoords);
          setError(encounteredError); // Set accumulated errors (or null if none)
          setIsLoading(false);
          processedAddressesRef.current = [...currentAddresses]; // Update processed addresses ref *after* completion
          initialFetchDoneRef.current = true; // Mark fetch as done for this set
          console.log('[useGeoCoding] State updated. isLoading: false.');
        };

        // Call fetchCoordinates with the current value of addresses from the outer scope
        fetchCoordinates(addresses);

    }, 500); // 500ms debounce delay

    // --- Cleanup function ---
    return () => {
        console.log('[useGeoCoding] Cleanup: Clearing debounce timeout.');
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        // No need to cancel ongoing axios requests here usually,
        // but could be added with AbortController if necessary for complex scenarios.
    };

  }, [addresses]); // Dependency array remains [addresses]

  return { coordinates, isLoading, error };
};

export default useGeoCoding;
