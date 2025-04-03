import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// @ts-ignore - No types available for leaflet-omnivore, suppress TS error
import omnivore from 'leaflet-omnivore';
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
  '#poly-000000-1200-77-nodesc': { color: '#000000', weight: 1.2, fillColor: '#000000', fillOpacity: 0.5 },
  '#poly-097138-1200-77-nodesc': { color: '#097138', weight: 1.2, fillColor: '#097138', fillOpacity: 0.5 },
  '#poly-9C27B0-1200-77-nodesc': { color: '#9C27B0', weight: 1.2, fillColor: '#9C27B0', fillOpacity: 0.5 },
  '#poly-9FA8DA-1200-77-nodesc': { color: '#9FA8DA', weight: 1.2, fillColor: '#9FA8DA', fillOpacity: 0.5 },
  '#poly-E65100-1200-77-nodesc': { color: '#E65100', weight: 1.2, fillColor: '#E65100', fillOpacity: 0.5 },
  '#poly-FFEA00-1200-77-nodesc': { color: '#FFEA00', weight: 1.2, fillColor: '#FFEA00', fillOpacity: 0.5 },
};

const defaultKmlStyle: L.PathOptions = {
  color: '#3388ff',
  weight: 3,
  fillColor: '#3388ff',
  fillOpacity: 0.5,
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ tickets }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const kmlLayerRef = useRef<L.GeoJSON | null>(null);
  const kmlLabelLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [kmlError, setKmlError] = useState<string | null>(null);

  // Map Initialization Effect
  useEffect(() => {
    if (mapRef.current) return;

    const newMap = L.map('map').setView([46.2276, 2.2137], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(newMap);

    mapRef.current = newMap;
    markerLayerGroupRef.current = L.layerGroup().addTo(newMap);
    kmlLabelLayerGroupRef.current = L.layerGroup().addTo(newMap);

    // --- Load KML Data ---
    setKmlError(null);
    const kmlUrl = '/secteurs.kml'; 
    console.log(`[InteractiveMap] Loading KML from: ${kmlUrl}`);

    const kmlLayer = omnivore.kml(kmlUrl)
      .on('ready', function(this: L.GeoJSON) {
        console.log('[InteractiveMap] KML loaded successfully');
        kmlLayerRef.current = this;
        
        this.eachLayer((layer: any) => {
          if (layer.feature?.properties) {
            const sectorName = layer.feature.properties.name;
            const styleUrl = layer.feature.properties.styleUrl;

            if (sectorName) {
              layer.bindPopup(`<b>Secteur:</b> ${sectorName}`);
              
              const appliedStyle = styleUrl && kmlStyleMap[styleUrl] 
                ? kmlStyleMap[styleUrl] 
                : defaultKmlStyle;
              
              if (typeof layer.setStyle === 'function') {
                layer.setStyle(appliedStyle);
              }
            }
          }
        });

        this.addTo(mapRef.current!);
      })
      .on('error', (e: any) => {
        console.error('[InteractiveMap] KML loading error:', e);
        setKmlError(`Erreur de chargement KML: ${e?.message || 'Erreur inconnue'}`);
      });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ... [rest of the component code]
};

export default InteractiveMap;
