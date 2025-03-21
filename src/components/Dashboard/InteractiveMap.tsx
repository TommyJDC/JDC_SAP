import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useGeoCoding from '../../hooks/useGeoCoding';

interface InteractiveMapProps {
  tickets: any[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null); // Ref for marker layer group
  const [markers, setMarkers] = useState<L.Marker[]>([]); // State to hold marker instances


  const addresses = useMemo(() => tickets?.map(ticket => ticket.adresse).filter(Boolean) as string[], [tickets]);
  const { coordinates: fetchedCoordinates, isLoading, error } = useGeoCoding(addresses);

  useEffect(() => {
    const newMap = L.map('map').setView([46.2276, 2.2137], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(newMap);

    setMap(newMap);
    mapRef.current = newMap;
    markerLayerGroupRef.current = L.layerGroup().addTo(newMap); // Initialize layer group

    console.log('Map initialized:', mapRef.current);
    return () => {
      newMap.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayerGroupRef.current) {
      console.log('Map not initialized yet.');
      return;
    }

    console.log('Tickets received in InteractiveMap:', tickets);
    console.log('Fetched Coordinates in InteractiveMap:', fetchedCoordinates);

    markerLayerGroupRef.current.clearLayers(); // Clear existing markers
    let newMarkers: L.Marker[] = []; // Array to hold new marker instances


    if (tickets && fetchedCoordinates) {
      tickets.forEach((ticket, index) => {
        if (ticket) { // Check if ticket is defined
          const address = ticket.adresse;
          const coordinate = fetchedCoordinates[index]; // Get coordinate for this ticket

          if (address && coordinate && coordinate.lat != null && coordinate.lng != null) { // More explicit check for coordinates
            const { lat, lng } = coordinate;
            console.log(`Adding marker for Ticket ID: ${ticket.id} at ${lat}, ${lng}`);
            console.log('Latitude:', lat, 'Longitude:', lng);

            try {
              const marker = L.marker([lat, lng])
                .addTo(markerLayerGroupRef.current!) // Add to layer group
                .bindPopup(`<b>${ticket.raisonSociale}</b><br>Ticket SAP: ${ticket.numeroSAP}`); // Updated popup content
              newMarkers.push(marker); // Add marker instance to array
            } catch (error) {
              console.error('Error adding marker:', error);
            }
          } else {
            console.log(`No address or coordinates for Ticket ID: ${ticket.id}`);
          }
        }
      });
    } else {
      console.log('No tickets or coordinates to display.');
    }
    setMarkers(newMarkers); // Update markers state
  }, [tickets, fetchedCoordinates]);

  useEffect(() => {
    if (mapRef.current && markers.length > 0) {
      const group = L.featureGroup(markers); // Create a feature group from markers
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] }); // Fit map to marker bounds with padding
    }
  }, [markers]);


  return <div id="map" style={{ height: '500px', width: '100%' }}></div>;
};

export default InteractiveMap;
