'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// 1. DYNAMIC IMPORT: Maintained as requested for map stability
const StoreMap = dynamic(() => import('@/components/StoreMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center font-black text-[#41644A] animate-pulse">
      MAP IS WAKING UP...
    </div>
  )
});

// Helper to calculate distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export default function NearestStorePage() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location access denied:", err.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    async function fetchStores() {
      try {
        // ALIASING: mapping new schema to your StoreMap's expected keys
        const { data, error } = await supabase
          .from('locations')
          .select('storeid:locationid, storename:name, address, latitude, longitude')
          .eq('location_type', 'store');
        
        if (data) setStores(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  const sortedStores = [...stores].sort((a, b) => {
    if (!userCoords) return 0;
    const distA = getDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
    const distB = getDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
    return distA - distB;
  });

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)] p-4">
      
      {/* Sidebar - INCREASED WIDTH TO 5 COLUMNS */}
      <div className="col-span-12 lg:col-span-5 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <div>
          <h1 className="text-3xl font-black text-[#263A29] tracking-tight">Nearest Stores</h1>
          <p className="text-gray-500 font-medium text-sm">Branches closest to your current location.</p>
        </div>

        {loading ? (
          <div className="p-10 text-center font-bold text-gray-400 animate-pulse uppercase tracking-widest">Locating...</div>
        ) : (
          sortedStores.map(s => (
            <div key={s.storeid} className="p-6 border border-gray-100 rounded-[32px] bg-white shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <h3 className="font-black text-xl text-[#263A29] group-hover:text-[#41644A] transition-colors">{s.storename}</h3>
                  <p className="text-sm text-gray-400 font-bold mt-2 leading-relaxed">{s.address}</p>
                </div>
                {userCoords && (
                  <span className="shrink-0 text-[10px] font-black bg-[#f3f4f1] text-[#41644A] px-4 py-2 rounded-full uppercase self-start">
                    {getDistance(userCoords.lat, userCoords.lng, s.latitude, s.longitude)} KM
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {!userCoords && !loading && (
          <div className="p-6 bg-amber-50 rounded-[24px] border border-amber-100">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide leading-tight">
              Pro Tip: Enable location services in your browser settings to see real-time distances to our branches.
            </p>
          </div>
        )}
      </div>

      {/* Map Container - DECREASED WIDTH TO 7 COLUMNS */}
      <div className="col-span-12 lg:col-span-7 rounded-[40px] overflow-hidden shadow-2xl bg-white border-8 border-white relative min-h-[400px]">
        <StoreMap stores={stores} userCoords={userCoords} />
      </div>

    </div>
  );
}