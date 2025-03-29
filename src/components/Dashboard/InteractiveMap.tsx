import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useGeoCoding from '../../hooks/useGeoCoding';

// Define Ticket type matching DashboardPage - Use 'adresse' (lowercase)
interface Ticket {
  id: string;
  adresse?: string; // *** Use this field (lowercase) for geocoding ***
  raisonSociale?: string; // Client name
  statut?: string; // Ticket status
  // Add other relevant Ticket fields if needed
  [key: string]: any;
}

interface InteractiveMapProps {
  tickets: Ticket[]; // Expect tickets instead of envois
}

// --- Custom Ticket Marker Icon using L.divIcon ---
// Simple blue circle marker
const ticketIcon = L.divIcon({
  className: 'custom-ticket-marker', // Add a class for potential CSS styling
  html: `<span style="background-color: #3498db; width: 1rem; height: 1rem; display: block; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></span>`,
  iconSize: [16, 16], // Size of the icon
  iconAnchor: [8, 8], // Point of the icon which will correspond to marker's location
  popupAnchor: [0, -10] // Point from which the popup should open relative to the iconAnchor
});
// --- End Custom Icon ---

// --- Default Leaflet Icon Fix (Keep for potential fallback or other maps) ---
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

// L.Marker.prototype.options.icon = DefaultIcon; // Don't set default globally if using custom icons
// --- End Icon Fix ---


const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);

  // *** Filter tickets *before* extracting addresses for geocoding ***
  const validTicketsForMap = useMemo(() => {
    console.log("[InteractiveMap] Filtering tickets for map display. Input tickets:", tickets);
    const validTickets = Array.isArray(tickets) ? tickets : [];
    const filtered = validTickets.filter(ticket =>
        typeof ticket.adresse === 'string' &&
        ticket.adresse.trim() !== '' &&
        ticket.adresse !== "Non trouvé" // *** CORRECTED: Filter out "Non trouvé" ***
    );
    console.log("[InteractiveMap] Filtered valid tickets for map:", filtered);
    return filtered;
  }, [tickets]);

  // *** Extract addresses ONLY from the pre-filtered valid tickets ***
  const addressesToGeocode = useMemo(() => {
    console.log("[InteractiveMap] Extracting addresses from validTicketsForMap.");
    const extractedAddresses = validTicketsForMap.map(ticket => ticket.adresse as string); // Already filtered, so cast is safer
    console.log("[InteractiveMap] Extracted addresses to geocode:", extractedAddresses);
    return extractedAddresses;
  }, [validTicketsForMap]); // Depend on the filtered list

  // Pass the filtered addresses to the hook
  const { coordinates: fetchedCoordinates, isLoading: geocodingIsLoading, error: geocodingError } = useGeoCoding(addressesToGeocode);

  // Map Initialization Effect
  useEffect(() => {
    if (mapRef.current) {
        console.log('[InteractiveMap] Map already initialized.');
        return; // Initialize map only once
    }

    console.log('[InteractiveMap] Initializing map...');
    const newMap = L.map('map').setView([46.2276, 2.2137], 6); // Default view (France)

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
  }, []); // Empty dependency array ensures this runs only once on mount

  // Marker Update Effect
  useEffect(() => {
    console.log('[InteractiveMap] Marker update effect triggered.');
    // Ensure map and layer group are ready
    if (!mapRef.current || !markerLayerGroupRef.current) {
      console.warn('[InteractiveMap] Map or Layer Group not ready. Skipping marker update.');
      return;
    }

    // Don't update markers while geocoding is in progress
    if (geocodingIsLoading) {
      console.log('[InteractiveMap] Geocoding in progress. Skipping marker update.');
      return;
    }

    console.log('[InteractiveMap] Conditions met for marker update.');
    console.log('[InteractiveMap] Received tickets prop:', tickets); // Log raw tickets prop
    console.log('[InteractiveMap] Calculated validTicketsForMap:', validTicketsForMap); // Use the filtered list
    console.log('[InteractiveMap] Received fetchedCoordinates from useGeoCoding:', fetchedCoordinates);
    console.log('[InteractiveMap] Geocoding isLoading:', geocodingIsLoading);
    console.log('[InteractiveMap] Geocoding error:', geocodingError);

    // --- Safeguards ---
    // Use validTicketsForMap for checks now
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
    // --- End Safeguards ---

    // Clear existing markers from the layer group
    console.log('[InteractiveMap] Clearing existing markers from layer group.');
    markerLayerGroupRef.current.clearLayers();
    let newMarkers: L.Marker[] = [];

    // Check for length mismatch AFTER confirming both are arrays
    // Compare the filtered list length with coordinates length
    if (validTicketsForMap.length !== fetchedCoordinates.length) {
        console.warn(`[InteractiveMap] Skipping marker update: Mismatch between validTicketsForMap length (${validTicketsForMap.length}) and fetchedCoordinates length (${fetchedCoordinates.length}). This might happen if geocoding failed for some addresses or if the input changed rapidly.`);
         setMarkers([]); // Reset markers state
         return;
    }

    console.log(`[InteractiveMap] Proceeding to create markers for ${validTicketsForMap.length} tickets.`);
    // Iterate over the pre-filtered list
    validTicketsForMap.forEach((ticket, index) => {
      const address = ticket.adresse; // Address is guaranteed to be valid and not "Non trouvé" here
      const coordinate = fetchedCoordinates[index]; // Get coordinate for this ticket

      // Ensure coordinate is valid before creating marker
      // No need to check address === "Non trouvé" again, already filtered
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
        // Log why a marker wasn't created (should only be coordinate issues now)
        if (!coordinate) {
           console.log(`[InteractiveMap] Skipping marker for Ticket ID: ${ticket.id} (Address: "${address}") because corresponding coordinate is null or invalid. Geocoding might have failed. Coordinate received:`, coordinate);
        } else {
           console.log(`[InteractiveMap] Skipping marker for Ticket ID: ${ticket.id} (Address: "${address}") due to invalid coordinate format. Coordinate received:`, coordinate);
        }
      }
    });

    // Add all new markers to the layer group at once
    if (newMarkers.length > 0) {
        console.log(`[InteractiveMap] Adding ${newMarkers.length} new markers to the layer group.`);
        newMarkers.forEach(marker => marker.addTo(markerLayerGroupRef.current!));
    } else {
        console.log(`[InteractiveMap] No valid markers were created.`);
    }

    setMarkers(newMarkers); // Update the markers state
    console.log(`[InteractiveMap] Marker update process finished. State updated with ${newMarkers.length} markers.`);

  // Dependencies: Update when tickets, geocoding status, or coordinates change.
  // validTicketsForMap is derived from tickets, so only tickets is needed here.
  // addressesToGeocode is derived from validTicketsForMap, so not needed here.
  }, [tickets, fetchedCoordinates, geocodingIsLoading, geocodingError, validTicketsForMap]); // Added validTicketsForMap dependency

  // Effect to fit map bounds to markers
  useEffect(() => {
    // Only run if map exists and geocoding is NOT loading
    if (mapRef.current && !geocodingIsLoading) {
        console.log(`[InteractiveMap] Fit bounds effect triggered. Markers count: ${markers.length}, Geocoding loading: ${geocodingIsLoading}`);
        if (markers.length > 0) {
            console.log(`[InteractiveMap] Fitting bounds for ${markers.length} markers.`);
            try {
                // Create a feature group from the markers in the state
                const group = L.featureGroup(markers);
                // Check if the group has valid bounds
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 }); // Focus logic
                    console.log("[InteractiveMap] Map bounds fitted.");
                } else {
                    console.warn("[InteractiveMap] Cannot fit bounds: Feature group bounds are invalid (possibly single marker or identical coordinates).");
                    // Optionally center on the first marker if bounds are invalid but markers exist
                    if(markers.length === 1) {
                        mapRef.current.setView(markers[0].getLatLng(), 15); // Zoom level 15 for single marker
                        console.log("[InteractiveMap] Centered on single marker.");
                    } else {
                         // Fallback if bounds invalid for multiple markers (unlikely but possible)
                         mapRef.current.setView([46.2276, 2.2137], 6);
                         console.log("[InteractiveMap] Resetting view due to invalid bounds for multiple markers.");
                    }
                }
            } catch (boundsError) {
                console.error("[InteractiveMap] Error fitting map bounds:", boundsError);
            }
        } else {
            console.log("[InteractiveMap] No markers to display, resetting map view.");
            mapRef.current.setView([46.2276, 2.2137], 6); // Reset to default view if no markers
        }
    } else if (mapRef.current && geocodingIsLoading) {
        console.log("[InteractiveMap] Skipping bounds update while loading coordinates.");
    } else if (!mapRef.current) {
         console.log("[InteractiveMap] Skipping bounds update: Map not initialized yet.");
    }
  }, [markers, geocodingIsLoading]); // Depend on markers state and geocoding loading status


  // Display Geocoding Error if present
  if (geocodingError) {
    // Display error prominently, but still render the map container
    console.error("[InteractiveMap] Rendering geocoding error message:", geocodingError);
    // return <div className="text-error p-4">Erreur de géocodage: {geocodingError}</div>;
  }

  return (
      <div className="relative">
          {/* Display loading overlay */}
          {geocodingIsLoading && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-[1000]">
                  <span className="loading loading-dots loading-lg text-white"></span>
                  <p className="ml-3 text-white font-semibold">Géocodage des adresses...</p>
              </div>
          )}
           {/* Display geocoding error */}
           {geocodingError && (
              <div className="absolute top-0 left-0 right-0 p-2 bg-error text-error-content text-center z-[1000] shadow-lg">
                  Erreur de géocodage: {geocodingError}
              </div>
           )}
          {/* Map container */}
          <div id="map" style={{ height: '500px', width: '100%' }}></div>
      </div>
  );
};

export default InteractiveMap;
