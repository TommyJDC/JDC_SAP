import { useState, useEffect } from 'react';
import axios from 'axios';

const GEOCODING_API_KEY = 'YOUR_OPEN_CAGE_API_KEY'; // Replace with your API key
const GEOCODING_URL = 'https://api.opencagedata.com/geocode/v1/json';

const useGeoCoding = (address: string) => {
  const [coordinates, setCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setCoordinates(null);
      return;
    }

    const fetchCoordinates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(GEOCODING_URL, {
          params: {
            q: address,
            key: GEOCODING_API_KEY,
          },
        });

        if (response.data.results && response.data.results.length > 0) {
          const geometry = response.data.results[0].geometry;
          setCoordinates({ lat: geometry.lat, lng: geometry.lng });
        } else {
          setError('Adresse non trouvée');
          setCoordinates(null);
        }
      } catch (err) {
        setError('Erreur lors du géocodage');
        setCoordinates(null);
        console.error('Geocoding error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoordinates();
  }, [address]);

  const getCoordinates = async (address: string) => {
    try {
      const response = await axios.get(GEOCODING_URL, {
        params: {
          q: address,
          key: GEOCODING_API_KEY,
        },
      });
      return response.data.results[0]?.geometry;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  return { coordinates, isLoading, error, getCoordinates };
};

export default useGeoCoding;
