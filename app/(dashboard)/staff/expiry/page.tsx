'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function StaffExpiryPage() {
  const [expiringItems, setExpiringItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchExpiring() {
      // 1. Get Today's Date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // 2. Define the "Danger Zone" (Next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // UPDATED: Using 'remainingqty' and products 'name'
      const { data, error } = await supabase
        .from('batches')
        .select(`
          batchid,
          batchnumber,
          expirydate,
          remainingqty,
          products!inner (
            name,
            barcode
          )
        `)
        // CRITICAL FILTERS:
        .gte('expirydate', today)        // Not already thrown away
        .lte('expirydate', nextWeekStr)  // Expiring within a week
        .gt('remainingqty', 0)           // Still on the shelf
        .order('expirydate', { ascending: true });

      if (!error) setExpiringItems(data || []);
    }
    fetchExpiring();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-[#263A29] mb-6 tracking-tighter uppercase">⚠️ SHORT-TERM EXPIRY ALERTS</h1>
      
      {expiringItems.length === 0 ? (
        <div className="p-10 bg-green-50 rounded-3xl text-center border-2 border-dashed border-green-200">
          <p className="text-green-700 font-bold uppercase text-xs tracking-widest">All stock is fresh! No immediate action required.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {expiringItems.map(item => (
            <div key={item.batchid} className="p-6 bg-white border-2 border-orange-100 rounded-3xl flex justify-between items-center shadow-sm hover:border-orange-200 transition-colors">
              <div>
                {/* Updated to item.products.name */}
                <h3 className="font-black text-lg text-[#263A29]">{item.products.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch Ref: {item.batchnumber}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-sm uppercase tracking-tighter ${new Date(item.expirydate) <= new Date() ? 'text-red-500' : 'text-orange-500'}`}>
                  Expires: {item.expirydate}
                </p>
                {/* Updated to item.remainingqty */}
                <p className="text-[10px] font-black text-gray-400 uppercase mt-1">Qty Remaining: {item.remainingqty}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}