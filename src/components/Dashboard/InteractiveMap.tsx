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
// Manually map KML style IDs (or parts) to Leaflet Path options
// KML uses ABGR hex (Alpha, Blue, Green, Red), Leaflet uses #RRGGBB hex
// KML Opacity '4d' hex = 77 decimal. 77/255 ≈ 0.3
const kmlStyleMap: { [key: string]: L.PathOptions } = {
  '#poly-000000-1200-77-nodesc': { color: '#000000', weight: 1.2, fillColor: '#000000', fillOpacity: 0.3 }, // Black
  '#poly-097138-1200-77-nodesc': { color: '#097138', weight: 1.2, fillColor: '#097138', fillOpacity: 0.3 }, // Dark Green
  '#poly-9C27B0-1200-77-nodesc': { color: '#9C27B0', weight: 1.2, fillColor: '#9C27B0', fillOpacity: 0.3 }, // Purple
  '#poly-9FA8DA-1200-77-nodesc': { color: '#9FA8DA', weight: 1.2, fillColor: '#9FA8DA', fillOpacity: 0.3 }, // Light Blue/Gray
  '#poly-E65100-1200-77-nodesc': { color: '#E65100', weight: 1.2, fillColor: '#E65100', fillOpacity: 0.3 }, // Orange
  '#poly-FFEA00-1200-77-nodesc': { color: '#FFEA00', weight: 1.2, fillColor: '#FFEA00', fillOpacity: 0.3 }, // Yellow
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
  const kmlLayerRef = useRef<L.Layer | null>(null);
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

    // --- Load KML Data ---
    setKmlError(null);
    const kmlUrl = '/secteurs.kml';
    console.log(`[InteractiveMap] Attempting to load KML from: ${kmlUrl}`);

    const kmlLayer = omnivore.kml(kmlUrl)
      .on('ready', function(this: L.GeoJSON) {
        if (mapRef.current) {
          console.log('[InteractiveMap] KML data loaded successfully.');
          kmlLayerRef.current = this;

          this.eachLayer((layer: any) => {
            if (layer.feature && layer.feature.properties) {
              const sectorName = layer.feature.properties.name;
              const styleUrl = layer.feature.properties.styleUrl;

              // Bind Popup
              if (sectorName) {
                layer.bindPopup(`<b>Secteur:</b> ${sectorName}`);
              } else {
                 console.warn('[InteractiveMap] KML feature found without a name property:', layer.feature);
              }

              // --- Apply Style using Manual Map ---
              let appliedStyle = defaultKmlStyle; // Start with default
              if (styleUrl && kmlStyleMap[styleUrl]) {
                  appliedStyle = kmlStyleMap[styleUrl];
                  console.log(`[InteractiveMap] Applying mapped style for ${sectorName || 'Unnamed Sector'} (StyleURL: ${styleUrl})`);
              } else {
                  console.warn(`[InteractiveMap] StyleURL "${styleUrl}" not found in kmlStyleMap for sector ${sectorName || 'Unnamed Sector'}. Applying default style.`);
              }

              try {
                  // Check if setStyle exists before calling
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

          this.addTo(mapRef.current);

        } else {
          console.warn('[InteractiveMap] KML loaded, but map was removed before adding layer.');
        }
      })
      .on('error', (e: any) => {
        console.error('[InteractiveMap] Error loading KML data:', e?.error || e);
        setKmlError(`Impossible de charger le fichier KML : ${e?.error?.message || 'Erreur inconnue'}`);
        kmlLayerRef.current = null;
      });
    // --- End Load KML Data ---


    return () => {
      if (mapRef.current) {
        if (kmlLayerRef.current) {
          mapRef.current.removeLayer(kmlLayerRef.current);
          kmlLayerRef.current = null;
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
  }, []);

  // Marker Update Effect
  useEffect(() => {
    if (!mapRef.current || !markerLayerGroupRef.current) {
      return;
    }
    if (geocodingIsLoading) {
      return;
    }

    // Ensure markerLayerGroupRef.current is valid before clearing
    if (!(markerLayerGroupRef.current instanceof L.LayerGroup)) {
        console.warn("[InteractiveMap] markerLayerGroupRef.current is not a valid LayerGroup in Marker Update Effect. Re-initializing.");
        // Attempt to re-initialize if map exists
        if (mapRef.current) {
            markerLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
        } else {
            return; // Cannot proceed without map
        }
    }


    if (!Array.isArray(validTicketsForMap) || !Array.isArray(fetchedCoordinates)) {
        markerLayerGroupRef.current.clearLayers();
        setMarkers([]);
        return;
    }

    markerLayerGroupRef.current.clearLayers();
    let newMarkers: L.Marker[] = [];

    if (validTicketsForMap.length !== fetchedCoordinates.length) {
        console.warn(`[InteractiveMap] Skipping marker update: Mismatch between validTicketsForMap length (${validTicketsForMap.length}) and fetchedCoordinates length (${fetchedCoordinates.length}).`);
         setMarkers([]);
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
      }
    });

    if (newMarkers.length > 0 && markerLayerGroupRef.current) {
        newMarkers.forEach(marker => marker.addTo(markerLayerGroupRef.current!));
    }

    setMarkers(newMarkers);

  }, [tickets, fetchedCoordinates, geocodingIsLoading, geocodingError, validTicketsForMap]);


  // Fit Bounds Effect (for markers)
  useEffect(() => {
    // Check map, marker layer group, and ensure geocoding is done
    if (mapRef.current && markerLayerGroupRef.current && !geocodingIsLoading) {
        // CRITICAL FIX: Check if markerLayerGroupRef.current is a valid LayerGroup AND has the getBounds method
        if (markerLayerGroupRef.current instanceof L.LayerGroup && typeof markerLayerGroupRef.current.getBounds === 'function') {
            if (markers.length > 0) {
                try {
                    const bounds = markerLayerGroupRef.current.getBounds();
                    // Check if bounds are valid (contain at least one point)
                    if (bounds.isValid()) {
                        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                    } else {
                        // Handle cases where bounds might be invalid even with markers (e.g., single marker at 0,0?)
                        if (markers.length === 1) {
                            mapRef.current.setView(markers[0].getLatLng(), 15); // Center on the single marker
                        } else if (!kmlLayerRef.current) {
                             mapRef.current.setView([46.2276, 2.2137], 6); // Reset view if no KML
                        }
                         console.warn("[InteractiveMap] Marker bounds are invalid despite having markers. Length:", markers.length);
                    }
                } catch (boundsError) {
                    // Catch potential errors during getBounds or fitBounds
                    console.error("[InteractiveMap] Error fitting map bounds to markers:", boundsError);
                }
            } else if (!kmlLayerRef.current) { // No markers and no KML layer
                mapRef.current.setView([46.2276, 2.2137], 6); // Reset view
            }
            // If KML is loaded but no markers, do nothing - let KML define view or keep initial view
        } else {
             console.warn("[InteractiveMap] Cannot fit bounds: markerLayerGroupRef.current is not a valid LayerGroup or getBounds is missing.");
        }
    }
  }, [markers, geocodingIsLoading, kmlLayerRef.current]); // Dependencies


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
