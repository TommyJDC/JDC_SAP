import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// @ts-ignore - No types available for leaflet-omnivore, suppress TS error
import omnivore from 'leaflet-omnivore'; // Import omnivore
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

// --- KML Style Mapping ---
const kmlStyleMap: { [key: string]: L.PathOptions } = {
  '#poly-000000-1200-77-nodesc': { color: '#000000', weight: 1.2, fillColor: '#000000', fillOpacity: 0.3 }, // Black (Julien Isère)
  '#poly-097138-1200-77-nodesc': { color: '#097138', weight: 1.2, fillColor: '#097138', fillOpacity: 0.3 }, // Dark Green (Julien)
  '#poly-9C27B0-1200-77-nodesc': { color: '#9C27B0', weight: 1.2, fillColor: '#9C27B0', fillOpacity: 0.3 }, // Purple (Matthieu)
  '#poly-9FA8DA-1200-77-nodesc': { color: '#9FA8DA', weight: 1.2, fillColor: '#9FA8DA', fillOpacity: 0.3 }, // Light Blue/Gray (Guillem)
  '#poly-E65100-1200-77-nodesc': { color: '#E65100', weight: 1.2, fillColor: '#E65100', fillOpacity: 0.3 }, // Orange (Florian)
  '#poly-FFEA00-1200-77-nodesc': { color: '#FFEA00', weight: 1.2, fillColor: '#FFEA00', fillOpacity: 0.3 }, // Yellow (Baptiste)
};

const defaultKmlStyle: L.PathOptions = {
  color: '#3388ff', // Default Leaflet blue
  weight: 3,
  fillColor: '#3388ff',
  fillOpacity: 0.2,
};
// --- End KML Style Mapping ---


const ticketIcon = L.divIcon({
  className: 'custom-ticket-marker',
  html: `<span style="background-color: #3498db; width: 1rem; height: 1rem; display: block; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10]
});

// Default Leaflet icon setup
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
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
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const kmlLayerRef = useRef<L.GeoJSON | null>(null);
  const kmlLabelLayerGroupRef = useRef<L.LayerGroup | null>(null); // Layer group for KML labels
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [kmlError, setKmlError] = useState<string | null>(null);

  const validTicketsForMap = useMemo(() => {
    const validTickets = Array.isArray(tickets) ? tickets : [];
    const filtered = validTickets.filter(ticket =>
        typeof ticket.adresse === 'string' &&
        ticket.adresse.trim() !== '' &&
        ticket.adresse !== "Non trouvé"
    );
    return filtered;
  }, [tickets]);

  const addressesToGeocode = useMemo(() => {
    const extractedAddresses = validTicketsForMap.map(ticket => ticket.adresse as string);
    return extractedAddresses;
  }, [validTicketsForMap]);

  const { coordinates: fetchedCoordinates, isLoading: geocodingIsLoading, error: geocodingError } = useGeoCoding(addressesToGeocode);

  // Map Initialization Effect
  useEffect(() => {
    if (mapRef.current) {
        return;
    }

    const newMap = L.map('map').setView([46.2276, 2.2137], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(newMap);

    mapRef.current = newMap;
    markerLayerGroupRef.current = L.layerGroup().addTo(newMap);
    kmlLabelLayerGroupRef.current = L.layerGroup().addTo(newMap); // Initialize KML label layer group

    // --- Load KML Data ---
    setKmlError(null);
    const kmlUrl = '/secteurs.kml'; // Path relative to public folder
    console.log(`[InteractiveMap] Attempting to load KML from: ${kmlUrl}`);

    const kmlLayer = omnivore.kml(kmlUrl)
      .on('ready', function(this: L.GeoJSON) { // 'this' context is the GeoJSON layer
        if (mapRef.current && kmlLabelLayerGroupRef.current) { // Ensure map and label group exist
          console.log('[InteractiveMap] KML data loaded successfully.');
          kmlLayerRef.current = this; // Store the KML layer reference
          kmlLabelLayerGroupRef.current.clearLayers(); // Clear previous labels if any

          this.eachLayer((layer: any) => {
            // Omnivore converts KML to GeoJSON, so we access properties via feature.properties
            if (layer.feature && layer.feature.properties) {
              const sectorName = layer.feature.properties.name;
              const styleUrl = layer.feature.properties.styleUrl; // KML style URL

              // Bind Popup using the 'name' property from KML
              if (sectorName) {
                layer.bindPopup(`<b>Secteur:</b> ${sectorName}`);

                // --- Add KML Name Label ---
                try {
                  if (typeof layer.getBounds === 'function') {
                    const bounds = layer.getBounds();
                    if (bounds && typeof bounds.getCenter === 'function') {
                      const center = bounds.getCenter();

                      // Create a transparent divIcon for the label
                      const labelIcon = L.divIcon({
                          className: 'kml-label-icon', // Keep class for potential future CSS
                          // Apply opacity and basic styling directly. Added text-shadow for better visibility.
                          html: `<span style="opacity: 0.5; font-weight: bold; font-size: 12px; color: black; text-shadow: 0 0 2px white, 0 0 2px white, 0 0 2px white;">${sectorName}</span>`,
                          iconSize: [100, 20], // Adjust size as needed (width, height)
                          iconAnchor: [50, 10] // Center the anchor (width/2, height/2)
                      });

                      // Create marker with the label icon and add to the label layer group
                      L.marker(center, { icon: labelIcon, interactive: false }) // Make non-interactive
                         .addTo(kmlLabelLayerGroupRef.current!); // Add to the dedicated label layer

                      console.log(`[InteractiveMap] Added label for sector: ${sectorName}`);

                    } else {
                       console.warn(`[InteractiveMap] Could not get center for sector: ${sectorName}. Bounds:`, bounds);
                    }
                  } else {
                     console.warn(`[InteractiveMap] layer.getBounds is not a function for sector: ${sectorName}. Cannot add label.`);
                  }
                } catch (labelError) {
                   console.error(`[InteractiveMap] Error creating label for sector ${sectorName}:`, labelError);
                }
                // --- End Add KML Name Label ---

              } else {
                 console.warn('[InteractiveMap] KML feature found without a name property:', layer.feature);
              }

              // --- Apply Style using Manual Map ---
              let appliedStyle = defaultKmlStyle; // Start with default
              if (styleUrl && kmlStyleMap[styleUrl]) {
                  appliedStyle = kmlStyleMap[styleUrl];
                  // console.log(`[InteractiveMap] Applying mapped style for ${sectorName || 'Unnamed Sector'} (StyleURL: ${styleUrl})`);
              } else {
                  console.warn(`[InteractiveMap] StyleURL "${styleUrl}" not found in kmlStyleMap for sector ${sectorName || 'Unnamed Sector'}. Applying default style.`);
              }

              try {
                  // Check if setStyle exists before calling (it should for polygons)
                  if (typeof layer.setStyle === 'function') {
                      layer.setStyle(appliedStyle);
                  } else {
                      console.warn(`[InteractiveMap] layer.setStyle is not a function for sector ${sectorName || 'Unnamed Sector'}. Layer type might not support styling.`, layer);
                  }
              } catch (styleError) {
                 console.error(`[InteractiveMap] Error applying style for ${sectorName || 'Unnamed Sector'}:`, styleError, appliedStyle);
              }
              // --- End Style Application ---

            } else {
              console.warn('[InteractiveMap] KML layer found without feature or properties:', layer);
            }
          });

          this.addTo(mapRef.current); // Add the styled KML layer to the map

          // Fit map bounds to the KML layer if no markers are present initially
          if (markers.length === 0 && kmlLayerRef.current) {
             try {
                const kmlBounds = kmlLayerRef.current.getBounds();
                if (kmlBounds.isValid()) {
                    mapRef.current.fitBounds(kmlBounds, { padding: [50, 50] });
                } else {
                    console.warn("[InteractiveMap] KML bounds are invalid.");
                }
             } catch (boundsError) {
                 console.error("[InteractiveMap] Error fitting map bounds to KML:", boundsError);
             }
          }

        } else {
          console.warn('[InteractiveMap] KML loaded, but map or label layer group was removed before processing.');
        }
      })
      .on('error', (e: any) => {
        console.error('[InteractiveMap] Error loading KML data:', e?.error || e);
        setKmlError(`Impossible de charger le fichier KML : ${e?.error?.message || 'Erreur inconnue'}`);
        kmlLayerRef.current = null; // Reset ref on error
      });
    // --- End Load KML Data ---


    return () => {
      if (mapRef.current) {
        // Remove KML layer if it exists
        if (kmlLayerRef.current) {
          mapRef.current.removeLayer(kmlLayerRef.current);
          kmlLayerRef.current = null;
        }
        // Remove KML label layer group
        if (kmlLabelLayerGroupRef.current) {
            mapRef.current.removeLayer(kmlLabelLayerGroupRef.current);
            kmlLabelLayerGroupRef.current = null;
        }
        // Also remove marker layer group
        if (markerLayerGroupRef.current) {
            mapRef.current.removeLayer(markerLayerGroupRef.current);
            markerLayerGroupRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Marker Update Effect
  useEffect(() => {
    if (!mapRef.current || !markerLayerGroupRef.current) {
      console.warn("[InteractiveMap] Map or marker layer group not ready for marker update.");
      return;
    }
    if (geocodingIsLoading) {
      console.log("[InteractiveMap] Geocoding in progress, skipping marker update.");
      return;
    }

    // Ensure markerLayerGroupRef.current is valid before clearing
    if (!(markerLayerGroupRef.current instanceof L.LayerGroup)) {
        console.warn("[InteractiveMap] markerLayerGroupRef.current is not a valid LayerGroup in Marker Update Effect. Re-initializing.");
        // Attempt to re-initialize if map exists
        if (mapRef.current) {
            markerLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
        } else {
            console.error("[InteractiveMap] Cannot re-initialize marker layer group: Map is null.");
            return; // Cannot proceed without map
        }
    }


    if (!Array.isArray(validTicketsForMap) || !Array.isArray(fetchedCoordinates)) {
        console.warn("[InteractiveMap] Invalid tickets or coordinates data, clearing markers.");
        markerLayerGroupRef.current.clearLayers();
        setMarkers([]);
        return;
    }

    markerLayerGroupRef.current.clearLayers();
    let newMarkers: L.Marker[] = [];

    // Check for length mismatch AFTER ensuring both are arrays
    if (validTicketsForMap.length !== fetchedCoordinates.length) {
        console.warn(`[InteractiveMap] Skipping marker update: Mismatch between validTicketsForMap length (${validTicketsForMap.length}) and fetchedCoordinates length (${fetchedCoordinates.length}). This might happen during data loading transitions.`);
         setMarkers([]); // Clear existing markers state
         return;
    }

    validTicketsForMap.forEach((ticket, index) => {
      const address = ticket.adresse;
      const coordinate = fetchedCoordinates[index];

      if (coordinate && typeof coordinate.lat === 'number' && typeof coordinate.lng === 'number') {
        const { lat, lng } = coordinate;
        try {
          const marker = L.marker([lat, lng], { icon: ticketIcon })
            .bindPopup(`<b>${ticket.raisonSociale || 'Client inconnu'}</b><br>Ticket ID: ${ticket.id}<br>Statut: ${ticket.statut || 'N/A'}<br>Adresse: ${address}`);
          newMarkers.push(marker);
        } catch (markerError) {
          console.error(`[InteractiveMap] Error creating marker instance for Ticket ID: ${ticket.id}:`, markerError);
        }
      } else {
         // console.log(`[InteractiveMap] Skipping marker for Ticket ID: ${ticket.id} due to invalid coordinates:`, coordinate);
      }
    });

    if (newMarkers.length > 0 && markerLayerGroupRef.current) {
        console.log(`[InteractiveMap] Adding ${newMarkers.length} new markers to the map.`);
        newMarkers.forEach(marker => marker.addTo(markerLayerGroupRef.current!));
    } else {
        console.log("[InteractiveMap] No valid new markers to add.");
    }

    setMarkers(newMarkers); // Update the state with the new markers array

  }, [tickets, fetchedCoordinates, geocodingIsLoading, geocodingError, validTicketsForMap]); // Dependencies for marker updates


  // Fit Bounds Effect (handles both markers and KML)
  useEffect(() => {
    if (!mapRef.current || geocodingIsLoading) {
        return; // Don't adjust bounds if map isn't ready or geocoding is happening
    }

    const hasMarkers = markers.length > 0;
    const hasKml = kmlLayerRef.current !== null;

    if (hasMarkers && markerLayerGroupRef.current instanceof L.LayerGroup && typeof markerLayerGroupRef.current.getBounds === 'function') {
        // Prioritize fitting to markers if they exist
        try {
            const markerBounds = markerLayerGroupRef.current.getBounds();
            if (markerBounds.isValid()) {
                console.log("[InteractiveMap] Fitting bounds to markers.");
                mapRef.current.fitBounds(markerBounds, { padding: [50, 50], maxZoom: 15 });
            } else {
                console.warn("[InteractiveMap] Marker bounds are invalid despite having markers. Length:", markers.length);
                // Fallback for invalid marker bounds (e.g., single marker)
                if (markers.length === 1) {
                    mapRef.current.setView(markers[0].getLatLng(), 15);
                } else if (!hasKml) { // Only reset if KML also isn't there
                    mapRef.current.setView([46.2276, 2.2137], 6);
                }
            }
        } catch (boundsError) {
            console.error("[InteractiveMap] Error fitting map bounds to markers:", boundsError);
        }
    } else if (hasKml && kmlLayerRef.current instanceof L.GeoJSON && typeof kmlLayerRef.current.getBounds === 'function') {
        // If no markers, fit to KML bounds if KML exists
        try {
            const kmlBounds = kmlLayerRef.current.getBounds();
            if (kmlBounds.isValid()) {
                console.log("[InteractiveMap] No markers, fitting bounds to KML layer.");
                mapRef.current.fitBounds(kmlBounds, { padding: [50, 50] });
            } else {
                console.warn("[InteractiveMap] KML bounds are invalid. Resetting view.");
                mapRef.current.setView([46.2276, 2.2137], 6); // Reset view if KML bounds invalid
            }
        } catch (boundsError) {
            console.error("[InteractiveMap] Error fitting map bounds to KML:", boundsError);
            mapRef.current.setView([46.2276, 2.2137], 6); // Reset on error
        }
    } else if (!hasMarkers && !hasKml) {
        // If neither markers nor KML are present, reset view
        console.log("[InteractiveMap] No markers or KML layer, resetting view.");
        mapRef.current.setView([46.2276, 2.2137], 6);
    }
    // If hasKml but no markers, the initial KML load effect already handled fitting bounds.

  }, [markers, geocodingIsLoading, kmlLayerRef.current]); // Re-run when markers, loading state, or KML layer ref changes


  if (geocodingError) {
    console.error("[InteractiveMap] Rendering geocoding error message:", geocodingError);
  }
   if (kmlError) {
    console.error("[InteractiveMap] Rendering KML error message:", kmlError);
  }

  return (
      <div className="relative">
          {/* Loading indicator for geocoding */}
          {geocodingIsLoading && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-[1000] pointer-events-none">
                  <span className="loading loading-dots loading-lg text-white"></span>
                  <p className="ml-3 text-white font-semibold">Géocodage des adresses...</p>
              </div>
          )}
           {/* Error display for geocoding */}
           {geocodingError && (
              <div className="absolute top-0 left-0 right-0 p-2 bg-error text-error-content text-center z-[1000] shadow-lg">
                  Erreur de géocodage: {geocodingError}
              </div>
           )}
           {/* Error display for KML loading */}
           {kmlError && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-warning text-warning-content text-center z-[1000] shadow-lg">
                  {kmlError}
              </div>
           )}
          <div id="map" style={{ height: '500px', width: '100%' }}></div>
      </div>
  );
};

export default InteractiveMap;
