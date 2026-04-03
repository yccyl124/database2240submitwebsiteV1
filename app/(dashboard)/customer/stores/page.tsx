'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Explicitly import the named 'StoreMap'
const StoreMap = dynamic(
  () => import('@/components/StoreMap'),
  { 
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-gray-50 animate-pulse rounded-[40px]" />
  }
);

export default function NearestStorePage() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [gpsError, setGpsError] = useState(false);

  const calculateDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsError(false);
        },
        (err) => {
          console.warn("GPS blocked");
          setGpsError(true);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    const fetchStores = async () => {
      // Mapping locationid -> storeid and name -> storename
      const { data } = await supabase
        .from('locations')
        .select('storeid:locationid, storename:name, address, latitude, longitude')
        .eq('location_type', 'store');
      
      if (data) setStores(data);
    };
    fetchStores();
  }, []);

  const sortedStores = useMemo(() => {
    return stores.map(s => {
      // Ensure we convert strings from DB to Numbers for the math function
      const distValue = userCoords 
        ? calculateDist(userCoords.lat, userCoords.lng, Number(s.latitude), Number(s.longitude)) 
        : null;
        
      return { ...s, dist: distValue };
    }).sort((a, b) => {
      if (!a.dist) return 1;
      if (!b.dist) return -1;
      return Number(a.dist) - Number(b.dist);
    });
  }, [stores, userCoords]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-black text-[#1a2e05]">Store Locator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Store Buttons */}
        <div className="lg:col-span-4 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {sortedStores.map(store => (
            <div key={store.storeid} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm hover:border-[#365314] transition-all">
              <h3 className="font-bold text-[#1a2e05]">{store.storename}</h3>
              <p className="text-[11px] text-gray-400 mt-1">{store.address}</p>
              
              <p className="mt-4 text-xs font-black text-[#365314]">
                📍 {store.dist 
                    ? `${store.dist} km` 
                    : (gpsError ? 'Enable GPS' : 'Calculating...')}
              </p>
            </div>
          ))}
          {stores.length === 0 && (
            <p className="text-center py-10 text-gray-300 font-bold italic">Finding locations...</p>
          )}
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-8 h-[500px] rounded-[40px] overflow-hidden border-8 border-white shadow-2xl relative">
          <StoreMap stores={stores} userCoords={userCoords} />
        </div>
      </div>
    </div>
  );
}