'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// IMPORTANT: You must import the Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons not showing in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to handle map re-centering when user coordinates change
function MapRecenter({ coords }: { coords: { lat: number, lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 14, { animate: true });
    }
  }, [coords, map]);
  return null;
}

interface StoreMapProps {
  stores: any[];
  userCoords: { lat: number; lng: number } | null;
}

export default function StoreMap({ stores, userCoords }: StoreMapProps) {
  // Default center (e.g., Central, Hong Kong) if no user coords
  const center: [number, number] = userCoords 
    ? [userCoords.lat, userCoords.lng] 
    : [22.3193, 114.1694]; 

  return (
    <MapContainer 
      center={center} 
      zoom={12} 
      style={{ height: '100%', width: '100%' }}
      // This key ensures the map instance is completely destroyed and 
      // recreated if we lose/gain user coordinates, preventing the "reused" error.
      key={userCoords ? 'with-user' : 'no-user'}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* Recenter map when user location is detected */}
      <MapRecenter coords={userCoords} />

      {/* User Marker */}
      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lng]}>
          <Popup>
            <div className="font-black text-[#263A29] uppercase text-[10px]">You are here</div>
          </Popup>
        </Marker>
      )}

      {/* Store Markers */}
      {stores.map((store) => (
        <Marker 
          key={store.storeid} 
          position={[Number(store.latitude), Number(store.longitude)]}
        >
          <Popup>
            <div className="p-1">
              <h4 className="font-black text-[#263A29] text-xs uppercase">{store.storename}</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1">{store.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}