import React, { useEffect, useState, useRef } from 'react';
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
  const { geocode } = useGeoCoding();
  const [mapReady, setMapReady] = useState(false);
  const geocodedAddressesRef = useRef<Map<string, { lat: number, lng: number }>>(new Map());
  const processingRef = useRef<boolean>(false);

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
          if (feature.properties && feature.properties.name) {
            const zoneName = feature.properties.name;
            return zoneColorMap[zoneName] || defaultZoneStyle;
          }
          return defaultZoneStyle;
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`<b>Secteur:</b> ${feature.properties.name}`);
          }
        }
      });
      
      // Add each zone from our kmlZones utility
      kmlZones.forEach(zone => {
        zonesLayer.addData(zone.feature);
      });
      
      zonesLayer.addTo(map);
      zonesLayerRef.current = zonesLayer;
      
      // Fit map to zones bounds
      if (zonesLayer.getBounds().isValid()) {
        map.fitBounds(zonesLayer.getBounds());
      }
      
      console.log("[InteractiveMap] Added GeoJSON zones to map with proper colors");
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
  }, []);

  // Process tickets and add markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    const addMarkersToMap = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      
      console.log(`[InteractiveMap] Processing ${tickets.length} tickets for markers`);
      
      // Clear existing markers first
      markersRef.current.forEach(marker => {
        if (mapRef.current) marker.remove();
      });
      markersRef.current = [];
      
      // Process each ticket
      for (const ticket of tickets) {
        if (!ticket.adresse) continue;
        
        try {
          // Check if we already geocoded this address
          let coordinates;
          if (geocodedAddressesRef.current.has(ticket.adresse)) {
            coordinates = geocodedAddressesRef.current.get(ticket.adresse);
            console.log(`[InteractiveMap] Using cached coordinates for: ${ticket.adresse}`, coordinates);
          } else {
            // Geocode the address
            const result = await geocode(ticket.adresse);
            if (result) {
              coordinates = { lat: result.latitude, lng: result.longitude };
              geocodedAddressesRef.current.set(ticket.adresse, coordinates);
              console.log(`[InteractiveMap] Geocoded address: ${ticket.adresse}`, coordinates);
            }
          }
          
          // Add marker if we have coordinates
          if (coordinates && mapRef.current) {
            // Use circular marker icon based on ticket status
            let markerColor = '#3388ff'; // Default blue
            
            // Change color based on ticket status if needed
            if (ticket.statut) {
              if (ticket.statut.toLowerCase().includes('en cours')) {
                markerColor = '#FFA500'; // Orange for in progress
              } else if (ticket.statut.toLowerCase().includes('terminé')) {
                markerColor = '#4CAF50'; // Green for completed
              } else if (ticket.statut.toLowerCase().includes('annulé')) {
                markerColor = '#F44336'; // Red for cancelled
              }
            }
            
            const circleIcon = createCircleMarker(markerColor);
            
            const marker = L.marker([coordinates.lat, coordinates.lng], { icon: circleIcon })
              .bindPopup(`<b>${ticket.raisonSociale || 'Sans nom'}</b><br/>${ticket.adresse}<br/>Statut: ${ticket.statut || 'Non défini'}`);
            
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
            console.log(`[InteractiveMap] Added circular marker for: ${ticket.adresse}`);
          }
        } catch (error) {
          console.error(`[InteractiveMap] Error processing ticket: ${ticket.id}`, error);
        }
      }
      
      processingRef.current = false;
      console.log(`[InteractiveMap] Added ${markersRef.current.length} circular markers to map`);
    };
    
    addMarkersToMap();
  }, [tickets, mapReady, geocode]);

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-lg"
      ></div>
      {mapError && (
        <div className="absolute top-2 right-2 bg-red-100 text-red-700 px-4 py-2 rounded">
          {mapError}
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
