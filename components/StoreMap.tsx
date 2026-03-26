'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for missing Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords && map) {
      map.setView(coords, 14);
      const timer = setTimeout(() => map.invalidateSize(), 200);
      return () => clearTimeout(timer);
    }
  }, [coords, map]);
  return null;
}

export default function StoreMap({ stores, userCoords }: { stores: any[], userCoords: any }) {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-gray-50 animate-pulse" />;

  const center: [number, number] = userCoords 
    ? [userCoords.lat, userCoords.lng] 
    : [22.3193, 114.1694]; 

  return (
    <div className="w-full h-full min-h-[400px]">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        // This key forces a re-render if the userCoords are found, 
        // preventing the "appendChild" error on uninitialized maps
        key={userCoords ? 'has-location' : 'no-location'}
      >
        <TileLayer 
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
        />
        
        <MapRecenter coords={userCoords ? [userCoords.lat, userCoords.lng] : null} />
        
        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={DefaultIcon}>
            <Popup><b>You are here</b></Popup>
          </Marker>
        )}

        {stores?.filter(s => s.latitude && s.longitude).map((store) => (
          <Marker 
            key={store.storeid} 
            position={[Number(store.latitude), Number(store.longitude)]}
            icon={DefaultIcon}
          >
            <Popup>
              <div className="p-1">
                <b className="text-brand-deep">{store.storename}</b><br/>
                <span className="text-[10px] text-gray-500">{store.address}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}