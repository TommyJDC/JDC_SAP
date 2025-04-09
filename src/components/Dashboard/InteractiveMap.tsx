import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useGeoCoding from '../../hooks/useGeoCoding';
import { kmlZones } from '../../utils/kmlZones';

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

// Zone colors mapping by name
const zoneColorMap: { [key: string]: L.PathOptions } = {
  'Baptiste': { color: '#097138', weight: 2, fillColor: '#097138', fillOpacity: 0.3 },
  'julien Isère': { color: '#9C27B0', weight: 2, fillColor: '#9C27B0', fillOpacity: 0.3 },
  'Julien': { color: '#E65100', weight: 2, fillColor: '#E65100', fillOpacity: 0.3 },
  'Florian': { color: '#FFEA00', weight: 2, fillColor: '#FFEA00', fillOpacity: 0.3 },
  'Matthieu': { color: '#9FA8DA', weight: 2, fillColor: '#9FA8DA', fillOpacity: 0.3 },
  'Guillem': { color: '#000000', weight: 2, fillColor: '#000000', fillOpacity: 0.3 },
};

// Default style for zones without a specific color
const defaultZoneStyle: L.PathOptions = {
  color: '#3388ff',
  weight: 2,
  fillColor: '#3388ff',
  fillOpacity: 0.3,
};

// Create a circular marker icon function
const createCircleMarker = (color: string = '#3388ff') => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color}; width:15px; height:15px; border-radius:50%; border: 2px solid white;"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
  });
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const zonesLayerRef = useRef<L.GeoJSON | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 1. Extract unique addresses from tickets
  const uniqueAddresses = useMemo(() => {
    const addresses = tickets
      .map(ticket => ticket.adresse)
      .filter((addr): addr is string => typeof addr === 'string' && addr.trim() !== ''); // Type guard
    return Array.from(new Set(addresses));
  }, [tickets]);

  // 2. Use the useGeoCoding hook with the extracted addresses
  const { coordinates: geocodedCoordinates, isLoading: isGeocoding, error: geocodingError } = useGeoCoding(uniqueAddresses);

  // Initialize map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log("[InteractiveMap] Initializing map...");
    const map = L.map(mapContainerRef.current).setView([46.2276, 2.2137], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Add the GeoJSON zones with proper colors
    try {
      const zonesLayer = L.geoJSON([], {
        style: (feature) => {
          if (feature?.properties?.name) {
            return zoneColorMap[feature.properties.name] || defaultZoneStyle;
          }
          return defaultZoneStyle;
        },
        onEachFeature: (feature, layer) => {
          if (feature?.properties?.name) {
            layer.bindPopup(`<b>Secteur:</b> ${feature.properties.name}`);
          }
        }
      });

      kmlZones.forEach(zone => {
        zonesLayer.addData(zone.feature);
      });

      zonesLayer.addTo(map);
      zonesLayerRef.current = zonesLayer;

      if (zonesLayer.getBounds().isValid()) {
        map.fitBounds(zonesLayer.getBounds());
      }

      console.log("[InteractiveMap] Added GeoJSON zones to map.");
    } catch (error) {
      console.error("[InteractiveMap] Error adding GeoJSON zones:", error);
      setMapError("Erreur lors du chargement des zones");
    }

    setMapReady(true);
    console.log("[InteractiveMap] Map initialized");

    return () => {
      console.log("[InteractiveMap] Cleaning up map");
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Process tickets and add markers when map is ready, tickets change, or geocoding results change
  useEffect(() => {
    if (!mapReady || !mapRef.current || isGeocoding) return; // Wait for map and geocoding

    console.log(`[InteractiveMap] Updating markers. Geocoding loading: ${isGeocoding}`);

    // Clear existing markers first
    markersRef.current.forEach(marker => {
      if (mapRef.current) marker.remove();
    });
    markersRef.current = [];

    // Process each ticket using the geocoded coordinates
    for (const ticket of tickets) {
      if (!ticket.adresse) continue;

      try {
        // 3. Get coordinates from the hook's result map
        const coordinates = geocodedCoordinates.get(ticket.adresse);

        // Add marker if we have coordinates
        if (coordinates && mapRef.current) {
          let markerColor = '#3388ff'; // Default blue

          // Change color based on ticket status
          if (ticket.statut) {
            const statusLower = ticket.statut.toLowerCase();
            if (statusLower.includes('en cours')) markerColor = '#FFA500'; // Orange
            else if (statusLower.includes('terminé')) markerColor = '#4CAF50'; // Green
            else if (statusLower.includes('annulé')) markerColor = '#F44336'; // Red
            else if (statusLower.includes('demande de rma')) markerColor = '#9C27B0'; // Purple for RMA
            else if (statusLower.includes('nouveau')) markerColor = '#2196F3'; // Blue for New
          }

          const circleIcon = createCircleMarker(markerColor);

          const marker = L.marker([coordinates.lat, coordinates.lng], { icon: circleIcon })
            .bindPopup(`<b>${ticket.raisonSociale || 'Sans nom'}</b><br/>${ticket.adresse}<br/>Statut: ${ticket.statut || 'Non défini'}`);

          marker.addTo(mapRef.current);
          markersRef.current.push(marker);
          // console.log(`[InteractiveMap] Added marker for: ${ticket.adresse}`); // Less verbose logging
        } else if (!coordinates && geocodedCoordinates.has(ticket.adresse)) {
          // Address was processed by geocoder but resulted in null (not found)
          console.warn(`[InteractiveMap] No coordinates found for address: ${ticket.adresse}`);
        }
        // If geocodedCoordinates doesn't have the address key, it might still be loading or failed silently in the hook
      } catch (error) {
        // This catch block might be less likely to trigger now, but kept for safety
        console.error(`[InteractiveMap] Error creating marker for ticket: ${ticket.id}`, error);
      }
    }

    console.log(`[InteractiveMap] Added ${markersRef.current.length} markers to map.`);

  }, [tickets, mapReady, geocodedCoordinates, isGeocoding]); // Depend on tickets, map readiness, and geocoding results/status

  // Handle geocoding errors
  useEffect(() => {
    if (geocodingError) {
      setMapError(`Erreur de géocodage: ${geocodingError}`);
    } else {
      // Clear geocoding-specific errors if it resolves
      // Keep other potential map errors (like zone loading)
      if (mapError?.startsWith('Erreur de géocodage')) {
         setMapError(null);
      }
    }
  }, [geocodingError]);


  return (
    <div className="relative">
      {isGeocoding && (
         <div className="absolute top-2 left-2 z-[1000] bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">
           Géocodage en cours...
         </div>
       )}
      <div
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-lg"
      ></div>
      {mapError && (
        <div className="absolute top-2 right-2 z-[1000] bg-red-100 text-red-700 px-4 py-2 rounded text-sm">
          {mapError}
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
