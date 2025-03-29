import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useGeoCoding from '../../hooks/useGeoCoding';

interface Ticket {
  id: string;
  adresse?: string;
  raisonSociale?: string;
  statut?: string;
  [key: string]: any;
}

interface InteractiveMapProps {
  tickets: Ticket[];
}

const ticketIcon = L.divIcon({
  className: 'custom-ticket-marker',
  html: `<span style="background-color: #3498db; width: 1rem; height: 1rem; display: block; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10]
});

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});


const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);

  const validTicketsForMap = useMemo(() => {
    console.log("[InteractiveMap] Filtering tickets for map display. Input tickets:", tickets);
    const validTickets = Array.isArray(tickets) ? tickets : [];
    const filtered = validTickets.filter(ticket =>
        typeof ticket.adresse === 'string' &&
        ticket.adresse.trim() !== '' &&
        ticket.adresse !== "Non trouvé"
    );
    console.log("[InteractiveMap] Filtered valid tickets for map:", filtered);
    return filtered;
  }, [tickets]);

  const addressesToGeocode = useMemo(() => {
    console.log("[InteractiveMap] Extracting addresses from validTicketsForMap.");
    const extractedAddresses = validTicketsForMap.map(ticket => ticket.adresse as string);
    console.log("[InteractiveMap] Extracted addresses to geocode:", extractedAddresses);
    return extractedAddresses;
  }, [validTicketsForMap]);

  const { coordinates: fetchedCoordinates, isLoading: geocodingIsLoading, error: geocodingError } = useGeoCoding(addressesToGeocode);

  useEffect(() => {
    if (mapRef.current) {
        console.log('[InteractiveMap] Map already initialized.');
        return;
    }

    console.log('[InteractiveMap] Initializing map...');
    const newMap = L.map('map').setView([46.2276, 2.2137], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(newMap);

    setMap(newMap);
    mapRef.current = newMap;
    markerLayerGroupRef.current = L.layerGroup().addTo(newMap);

    console.log('[InteractiveMap] Map initialized:', mapRef.current);
    console.log('[InteractiveMap] Marker layer group created:', markerLayerGroupRef.current);

    return () => {
      if (mapRef.current) {
        console.log('[InteractiveMap] Removing map...');
        mapRef.current.remove();
        mapRef.current = null;
        console.log('[InteractiveMap] Map removed');
      }
    };
  }, []);

  useEffect(() => {
    console.log('[InteractiveMap] Marker update effect triggered.');
    if (!mapRef.current || !markerLayerGroupRef.current) {
      console.warn('[InteractiveMap] Map or Layer Group not ready. Skipping marker update.');
      return;
    }

    if (geocodingIsLoading) {
      console.log('[InteractiveMap] Geocoding in progress. Skipping marker update.');
      return;
    }

    console.log('[InteractiveMap] Conditions met for marker update.');
    console.log('[InteractiveMap] Received tickets prop:', tickets);
    console.log('[InteractiveMap] Calculated validTicketsForMap:', validTicketsForMap);
    console.log('[InteractiveMap] Received fetchedCoordinates from useGeoCoding:', fetchedCoordinates);
    console.log('[InteractiveMap] Geocoding isLoading:', geocodingIsLoading);
    console.log('[InteractiveMap] Geocoding error:', geocodingError);

    if (!Array.isArray(validTicketsForMap)) {
        console.warn('[InteractiveMap] Skipping marker update: validTicketsForMap is not an array.');
        markerLayerGroupRef.current.clearLayers();
        setMarkers([]);
        return;
    }
     if (!Array.isArray(fetchedCoordinates)) {
        console.warn('[InteractiveMap] Skipping marker update: fetchedCoordinates is not an array.');
        markerLayerGroupRef.current.clearLayers();
        setMarkers([]);
        return;
    }

    console.log('[InteractiveMap] Clearing existing markers from layer group.');
    markerLayerGroupRef.current.clearLayers();
    let newMarkers: L.Marker[] = [];

    if (validTicketsForMap.length !== fetchedCoordinates.length) {
        console.warn(`[InteractiveMap] Skipping marker update: Mismatch between validTicketsForMap length (${validTicketsForMap.length}) and fetchedCoordinates length (${fetchedCoordinates.length}). This might happen if geocoding failed for some addresses or if the input changed rapidly.`);
         setMarkers([]);
         return;
    }

    console.log(`[InteractiveMap] Proceeding to create markers for ${validTicketsForMap.length} tickets.`);
    validTicketsForMap.forEach((ticket, index) => {
      const address = ticket.adresse;
      const coordinate = fetchedCoordinates[index];

      if (coordinate && typeof coordinate.lat === 'number' && typeof coordinate.lng === 'number') {
        const { lat, lng } = coordinate;
        console.log(`[InteractiveMap] Adding marker for Ticket ID: ${ticket.id} (${ticket.raisonSociale || 'N/A'}) at [${lat}, ${lng}] using address: "${address}"`);

        try {
          const marker = L.marker([lat, lng], { icon: ticketIcon })
            .bindPopup(`<b>${ticket.raisonSociale || 'Client inconnu'}</b><br>Ticket ID: ${ticket.id}<br>Statut: ${ticket.statut || 'N/A'}<br>Adresse: ${address}`);
          newMarkers.push(marker);
        } catch (markerError) {
          console.error(`[InteractiveMap] Error creating marker instance for Ticket ID: ${ticket.id}:`, markerError);
        }
      } else {
        if (!coordinate) {
           console.log(`[InteractiveMap] Skipping marker for Ticket ID: ${ticket.id} (Address: "${address}") because corresponding coordinate is null or invalid. Geocoding might have failed. Coordinate received:`, coordinate);
        } else {
           console.log(`[InteractiveMap] Skipping marker for Ticket ID: ${ticket.id} (Address: "${address}") due to invalid coordinate format. Coordinate received:`, coordinate);
        }
      }
    });

    if (newMarkers.length > 0) {
        console.log(`[InteractiveMap] Adding ${newMarkers.length} new markers to the layer group.`);
        newMarkers.forEach(marker => marker.addTo(markerLayerGroupRef.current!));
    } else {
        console.log(`[InteractiveMap] No valid markers were created.`);
    }

    setMarkers(newMarkers);
    console.log(`[InteractiveMap] Marker update process finished. State updated with ${newMarkers.length} markers.`);

  }, [tickets, fetchedCoordinates, geocodingIsLoading, geocodingError, validTicketsForMap]);


  useEffect(() => {
    if (mapRef.current && !geocodingIsLoading) {
        console.log(`[InteractiveMap] Fit bounds effect triggered. Markers count: ${markers.length}, Geocoding loading: ${geocodingIsLoading}`);
        if (markers.length > 0) {
            console.log(`[InteractiveMap] Fitting bounds for ${markers.length} markers.`);
            try {
                const group = L.featureGroup(markers);
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                    console.log("[InteractiveMap] Map bounds fitted.");
                } else {
                    console.warn("[InteractiveMap] Cannot fit bounds: Feature group bounds are invalid (possibly single marker or identical coordinates).");
                    if(markers.length === 1) {
                        mapRef.current.setView(markers[0].getLatLng(), 15);
                        console.log("[InteractiveMap] Centered on single marker.");
                    } else {
                         mapRef.current.setView([46.2276, 2.2137], 6);
                         console.log("[InteractiveMap] Resetting view due to invalid bounds for multiple markers.");
                    }
                }
            } catch (boundsError) {
                console.error("[InteractiveMap] Error fitting map bounds:", boundsError);
            }
        } else {
            console.log("[InteractiveMap] No markers to display, resetting map view.");
            mapRef.current.setView([46.2276, 2.2137], 6);
        }
    } else if (mapRef.current && geocodingIsLoading) {
        console.log("[InteractiveMap] Skipping bounds update while loading coordinates.");
    } else if (!mapRef.current) {
         console.log("[InteractiveMap] Skipping bounds update: Map not initialized yet.");
    }
  }, [markers, geocodingIsLoading]);


  if (geocodingError) {
    console.error("[InteractiveMap] Rendering geocoding error message:", geocodingError);
  }

  return (
      <div className="relative">
          {geocodingIsLoading && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-[1000]">
                  <span className="loading loading-dots loading-lg text-white"></span>
                  <p className="ml-3 text-white font-semibold">Géocodage des adresses...</p>
              </div>
          )}
           {geocodingError && (
              <div className="absolute top-0 left-0 right-0 p-2 bg-error text-error-content text-center z-[1000] shadow-lg">
                  Erreur de géocodage: {geocodingError}
              </div>
           )}
          <div id="map" style={{ height: '500px', width: '100%' }}></div>
      </div>
  );
};

export default InteractiveMap;
