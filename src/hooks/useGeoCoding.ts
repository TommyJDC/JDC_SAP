import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { fetchGeocode, storeGeocode } from '../services/firebaseService';

const GEOCODING_API_KEY = 'b93a76ecb4b0439dbfe9e64c3c6aff07';
const GEOCODING_URL = 'https://api.opencagedata.com/geocode/v1/json';

const useGeoCoding = (addresses: string[]) => {
  const [coordinates, setCoordinates] = useState<({ lat: number, lng: number } | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousAddresses = useRef<string[]>([]);

  useEffect(() => {
    console.log('useGeoCoding useEffect triggered with addresses:', addresses);

    // Check if addresses have changed
    const addressesChanged =
      addresses.length !== previousAddresses.current.length ||
      addresses.some((address, index) => address !== previousAddresses.current[index]);

    if (!addressesChanged) {
      console.log('Addresses not changed, skipping geocoding.');
      return; // Skip fetching if addresses haven't changed
    }

    previousAddresses.current = addresses; // Update previous addresses

    if (!addresses || addresses.length === 0) {
      setCoordinates([]);
      console.log('No addresses provided, resetting coordinates.');
      return;
    }

    const fetchCoordinates = async () => {
      setIsLoading(true);
      setError(null);
      const coordsResults: ({ lat: number, lng: number } | null)[] = [];

      for (const address of addresses) {
        try {
          console.log(`Checking DB for geocode for address: ${address}`);
          // Check if geocode exists in the database
          const storedGeocode = await fetchGeocode(address);
          if (storedGeocode) {
            console.log(`Geocode found in DB for address: ${address}`, storedGeocode);
            coordsResults.push({ lat: storedGeocode.latitude, lng: storedGeocode.longitude });
          } else {
            console.log(`Geocode not found in DB for address: ${address}, fetching from API`);
            // Fetch geocode from API only if not in DB
            try { // ADDED TRY CATCH BLOCK FOR API CALL
              const response = await axios.get(GEOCODING_URL, {
                params: {
                  q: address,
                  key: GEOCODING_API_KEY,
                },
              });

              if (response.data.results && response.data.results.length > 0) {
                const geometry = response.data.results[0].geometry;
                const newGeocode = { lat: geometry.lat, lng: geometry.lng };
                coordsResults.push(newGeocode);
                // Store geocode in DB
                await storeGeocode(address, newGeocode.lat, newGeocode.lng);
                console.log(`Geocode fetched and stored for address: ${address}`, newGeocode);
              } else {
                coordsResults.push(null);
                console.log(`No geocode found for address: ${address} from API`);
              }
            } catch (apiError: any) { // CATCH API ERROR SEPARATELY
              if (apiError.response?.status === 402) {
                setError('Erreur de géocodage: Limite d\'utilisation de l\'API atteinte (402)');
                console.error('Geocoding API 402 error:', apiError.message);
              } else {
                setError('Erreur lors du géocodage');
                console.error('Geocoding API error:', apiError.message, apiError); // Include full apiError for debugging
              }
              coordsResults.push(null);
            }
          }
        } catch (dbError: any) { // ADDED CATCH BLOCK FOR DB ERROR
          setError('Erreur lors de la récupération du géocodage depuis la base de données');
          coordsResults.push(null);
          console.error('Geocoding DB error:', dbError.message);
        }
      }
      setCoordinates(coordsResults);
      setIsLoading(false);
      console.log('useGeoCoding useEffect finished, coordinates updated:', coordsResults);
    };

    fetchCoordinates();
  }, [addresses]); // Dependency array is [addresses]

  return { coordinates, isLoading, error };
};

export default useGeoCoding;
