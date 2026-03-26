'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Explicitly import the named 'StoreMap'
const StoreMap = dynamic(
  () => import('@/components/StoreMap').then((mod) => mod.StoreMap),
  { 
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-gray-50 animate-pulse rounded-[40px]" />
  }
);

export default function NearestStorePage() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<any[]>([]);

  const calculateDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("GPS blocked"),
      { enableHighAccuracy: true }
    );

    const fetchStores = async () => {
      const { data } = await supabase.from('stores').select('*');
      if (data) setStores(data);
    };
    fetchStores();
  }, []);

  const sortedStores = useMemo(() => {
    return stores.map(s => ({
      ...s,
      dist: userCoords ? calculateDist(userCoords.lat, userCoords.lng, s.latitude, s.longitude) : null
    })).sort((a, b) => Number(a.dist || 999) - Number(b.dist || 999));
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
              <p className="mt-4 text-xs font-black text-[#365314]">📍 {store.dist ? `${store.dist} km` : 'Calculating...'}</p>
            </div>
          ))}
        </div>

        {/* Right Column: Map - height matched to the max-h of the list */}
        <div className="lg:col-span-8 h-[500px] rounded-[40px] overflow-hidden border-8 border-white shadow-2xl relative">
          <StoreMap stores={stores} userCoords={userCoords} />
        </div>
      </div>
    </div>
  );
}