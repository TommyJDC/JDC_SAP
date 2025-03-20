import React, { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface InteractiveMapProps {
  tickets: any[]; // Replace 'any' with the actual ticket type
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  useEffect(() => {
    const map = L.map('map').setView([51.505, -0.09], 13); // Default view, adjust as needed

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    tickets.forEach(ticket => {
      if (ticket.coordinates) { // Assuming tickets have a coordinates property { lat, lng }
        L.marker([ticket.coordinates.lat, ticket.coordinates.lng]).addTo(map)
          .bindPopup(`Ticket ID: ${ticket.id}`);
      }
    });

    return () => {
      map.remove(); // Cleanup map instance on unmount
    };
  }, [tickets]);

  return <div id="map" style={{ height: '500px', width: '100%' }}></div>;
};

export default InteractiveMap;
