'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllPromotions() {
      setLoading(true);
      
      // ALIASING: mapping new schema (code, value, type) to your existing keys
      const { data, error } = await supabase
        .from('discounts') 
        .select(`
          discountcode:code, 
          discountvalue:value, 
          discounttype:type, 
          enddate, 
          description
        `)
        .eq('status', 'active')
        // Keeps your logic of showing store-wide/category-wide offers
        .is('productid', null) 
        .lte('startdate', new Date().toISOString().split('T')[0])
        .gte('enddate', new Date().toISOString().split('T')[0])
        .order('enddate', { ascending: true });

      if (error) {
        console.error("Linkage Error:", error.message);
      } else if (data) {
        setPromos(data);
      }
      setLoading(false);
    }
    fetchAllPromotions();
  }, []);

  return (
    <div className="w-full">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-[#1a2e05]">Active Rewards</h1>
        <p className="text-gray-400 font-medium mt-2 text-lg">
          These offers are <span className="text-[#365314] font-bold">automatically applied</span> to your cart when requirements are met.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
          {promos.map((promo, idx) => (
            <div key={idx} className="group p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 min-h-[260px]">
              
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f4f7ed] rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-[#f4f7ed] px-3 py-1 rounded-full border border-[#e2e8d5] mb-6">
                  <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-ping"></span>
                  <span className="text-[10px] font-black text-[#365314] uppercase tracking-tighter">Auto-Applied</span>
                </div>
                
                <h3 className="text-3xl font-black text-[#1a2e05] mb-2">
                  {promo.discounttype === 'percentage' ? `${Math.round(promo.discountvalue)}%` : `$${promo.discountvalue}`} OFF
                </h3>
                
                <p className="text-gray-500 font-medium text-base mb-6 leading-relaxed">
                  {promo.description || "Auto-applied reward for your current session."}
                </p>
              </div>

              <div className="relative z-10 mt-auto flex items-center justify-between pt-4 border-t border-dashed border-gray-100">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Internal Reference</p>
                  <span className="text-lg font-mono font-bold text-[#365314] uppercase opacity-40">
                    {promo.discountcode}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ends On</p>
                  <span className="text-sm font-bold text-red-400">
                    {new Date(promo.enddate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {promos.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <h3 className="text-xl font-bold text-gray-400">No active promotions currently available.</h3>
              <p className="text-gray-400 mt-2">Check back soon for new seasonal discounts!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}