import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { fetchGeocode, storeGeocode } from '../services/firebaseService';

// IMPORTANT: Replace with your actual OpenCageData API key
// Consider using environment variables for security: import.meta.env.VITE_OPENCAGE_API_KEY
const GEOCODING_API_KEY = 'b93a76ecb4b0439dbfe9e64c3c6aff07';
const GEOCODING_URL = 'https://api.opencagedata.com/geocode/v1/json';

// Define the structure for coordinates
interface Coordinates {
    lat: number;
    lng: number;
}

// Define the structure returned by the hook
interface UseGeoCodingResult {
    coordinates: Map<string, Coordinates | null>;
    isLoading: boolean;
    error: string | null;
}

const useGeoCoding = (addresses: string[]): UseGeoCodingResult => {
    // State to store the map of addresses to coordinates
    const [coordinates, setCoordinates] = useState<Map<string, Coordinates | null>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Ref to track addresses currently being processed to avoid redundant calls
    const processingRef = useRef<Set<string>>(new Set());
    // Ref to track mounted state
    const isMounted = useRef(true);

    useEffect(() => {
        // Set mounted ref to false on unmount
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // The core geocoding function for a single address
    const geocodeAddress = useCallback(async (address: string): Promise<Coordinates | null> => {
        console.log(`[useGeoCoding] geocodeAddress called for: "${address}"`);
        // Check if already processed or currently processing
        if (coordinates.has(address) || processingRef.current.has(address)) {
            console.log(`[useGeoCoding] Skipping already processed/processing address: "${address}"`);
            return coordinates.get(address) || null; // Return existing data if available
        }

        // Mark as processing
        processingRef.current.add(address);

        try {
            // 1. Check Firestore cache
            console.log(`[useGeoCoding] Checking DB for: "${address}"`);
            const storedGeocode = await fetchGeocode(address);
            if (storedGeocode) {
                console.log(`[useGeoCoding] DB Hit for: "${address}"`, storedGeocode);
                const coords = { lat: storedGeocode.latitude, lng: storedGeocode.longitude };
                // Update state only if component is still mounted
                if (isMounted.current) {
                    setCoordinates(prevMap => new Map(prevMap).set(address, coords));
                }
                processingRef.current.delete(address); // Mark as done
                return coords;
            }

            // 2. Fetch from API if not in DB
            console.log(`[useGeoCoding] DB Miss for: "${address}". Fetching from API.`);
            if (!GEOCODING_API_KEY || GEOCODING_API_KEY === 'YOUR_API_KEY_HERE') {
                console.error("[useGeoCoding] API Key is missing or placeholder!");
                throw new Error("Clé API manquante");
            }

            try {
                const response = await axios.get(GEOCODING_URL, {
                    params: {
                        q: address,
                        key: GEOCODING_API_KEY,
                        language: 'fr',
                        countrycode: 'fr',
                        limit: 1
                    },
                    timeout: 7000
                });

                if (response.data.results && response.data.results.length > 0) {
                    const geometry = response.data.results[0].geometry;
                    if (geometry && typeof geometry.lat === 'number' && typeof geometry.lng === 'number') {
                        const newCoords = { lat: geometry.lat, lng: geometry.lng };
                        console.log(`[useGeoCoding] API Success for: "${address}"`, newCoords);
                        // Store in DB (fire and forget)
                        storeGeocode(address, newCoords.lat, newCoords.lng)
                            .catch(err => console.error(`[useGeoCoding] Failed to store geocode for "${address}":`, err));
                        // Update state only if component is still mounted
                        if (isMounted.current) {
                            setCoordinates(prevMap => new Map(prevMap).set(address, newCoords));
                        }
                        processingRef.current.delete(address); // Mark as done
                        return newCoords;
                    } else {
                        console.warn(`[useGeoCoding] No valid geometry from API for: "${address}"`, response.data.results[0]);
                        // Store null to indicate lookup failed but was attempted
                        if (isMounted.current) {
                            setCoordinates(prevMap => new Map(prevMap).set(address, null));
                        }
                        processingRef.current.delete(address); // Mark as done
                        return null;
                    }
                } else {
                    console.warn(`[useGeoCoding] No results from API for: "${address}"`);
                     // Store null to indicate lookup failed but was attempted
                    if (isMounted.current) {
                        setCoordinates(prevMap => new Map(prevMap).set(address, null));
                    }
                    processingRef.current.delete(address); // Mark as done
                    return null;
                }
            } catch (apiError: any) {
                let errorMsg = `Erreur API pour "${address}"`;
                // ... (keep existing detailed API error handling) ...
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
                // Set general error state, but store null for this specific address
                if (isMounted.current) {
                    setError(errorMsg); // Set general error for UI feedback
                    setCoordinates(prevMap => new Map(prevMap).set(address, null));
                }
                processingRef.current.delete(address); // Mark as done
                return null;
            }
        } catch (dbError: any) {
            const errorMsg = `Erreur DB pour "${address}"`;
            console.error('[useGeoCoding] Geocoding DB error:', dbError.message);
             // Set general error state, but store null for this specific address
            if (isMounted.current) {
                setError(errorMsg); // Set general error for UI feedback
                setCoordinates(prevMap => new Map(prevMap).set(address, null));
            }
            processingRef.current.delete(address); // Mark as done
            return null;
        }
    }, [coordinates]); // Dependency on coordinates map to access cached results

    // Effect to process the addresses array
    useEffect(() => {
        // Check if addresses is an array before proceeding
        if (!Array.isArray(addresses)) {
            console.error("[useGeoCoding] Addresses is not an array:", addresses);
            setError("Invalid addresses input");
            setIsLoading(false);
            return;
        }

        // Create a Set of unique addresses from the input array
        const uniqueAddresses = new Set(addresses.filter(addr => typeof addr === 'string' && addr.trim() !== ''));
        let didStartProcessing = false;

        // Reset error when addresses change
        setError(null);

        // Function to process addresses sequentially
        const processAddresses = async () => {
            setIsLoading(true);
            for (const address of uniqueAddresses) {
                // Check if component is still mounted before processing next address
                if (!isMounted.current) break;
                // Check if the address is already in the map or being processed
                if (!coordinates.has(address) && !processingRef.current.has(address)) {
                    didStartProcessing = true;
                    await geocodeAddress(address);
                    // Optional: Add a small delay between API calls if rate limiting is an issue
                    // await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            // Set loading to false only if component is still mounted after processing all
            if (isMounted.current) {
                setIsLoading(false);
                console.log('[useGeoCoding] Finished processing all addresses.');
            }
        };

        console.log(`[useGeoCoding] useEffect triggered. Processing ${uniqueAddresses.size} unique addresses.`);
        processAddresses();

        // Cleanup function (optional, as processing stops if unmounted)
        return () => {
            console.log('[useGeoCoding] Cleanup effect.');
            // Potentially cancel ongoing Axios requests if needed
        };
    // Dependencies: addresses array (stringified for stability) and the geocodeAddress function
    }, [JSON.stringify(addresses), geocodeAddress]); // Stringify addresses to trigger effect only on content change

    return { coordinates, isLoading, error };
};

export default useGeoCoding;
