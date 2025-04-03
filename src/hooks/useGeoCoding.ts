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


const useGeoCoding = () => {
  const [coordinates, setCoordinates] = useState<({ lat: number, lng: number } | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref to store the addresses from the *last completed* geocoding operation
  const processedAddressesRef = useRef<string[]>([]);
  // Ref to track if the initial fetch is done for the current set of addresses
  const initialFetchDoneRef = useRef<boolean>(false);
   // Ref to store the timeout ID for debouncing
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geocode = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    console.log(`[useGeoCoding] geocode function called for address: ${address}`);
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useGeoCoding] Checking DB for: "${address}"`);
      const storedGeocode = await fetchGeocode(address);
      if (storedGeocode) {
        console.log(`[useGeoCoding] DB Hit for: "${address}"`, storedGeocode);
        setIsLoading(false);
        return { latitude: storedGeocode.latitude, longitude: storedGeocode.longitude };
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
                const newGeocode = { latitude: geometry.lat, longitude: geometry.lng };
                console.log(`[useGeoCoding] API Success for: "${address}"`, newGeocode);
                // Store geocode in DB asynchronously (fire and forget)
                storeGeocode(address, newGeocode.latitude, newGeocode.longitude)
                  .then(() => console.log(`[useGeoCoding] Stored geocode for: "${address}"`))
                  .catch(err => console.error(`[useGeoCoding] Failed to store geocode for "${address}":`, err));
                setIsLoading(false);
                return newGeocode;
            } else {
                 console.warn(`[useGeoCoding] No valid geometry from API for: "${address}"`, response.data.results[0]);
                 setIsLoading(false);
                 return null;
            }
          } else {
            console.warn(`[useGeoCoding] No results from API for: "${address}"`);
            setIsLoading(false);
            return null;
          }
        } catch (apiError: any) {
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
          setError(errorMsg);
          setIsLoading(false);
          return null;
        }
      }
    } catch (dbError: any) {
      const errorMsg = `Erreur DB pour "${address}"`;
      setError(errorMsg);
      console.error('[useGeoCoding] Geocoding DB error:', dbError.message);
      setIsLoading(false);
      return null;
    }
  };

  return { geocode, coordinates, isLoading, error };
};

export default useGeoCoding;
