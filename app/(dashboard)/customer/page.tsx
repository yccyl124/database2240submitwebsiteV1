'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CustomerDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // Fetch Discount Codes
        const { data: promoData } = await supabase
          .from('discounts')
          .select('discountid, discountcode:code, discountpercentage:value')
          .eq('status', 'active') 
          .lte('startdate', today)
          .gte('enddate', today);

        if (promoData) setActivePromos(promoData);

        // Fetch Products
        const { data: productData } = await supabase
          .from('products')
          .select('productid, productname:name, currentprice, categoryid')
          .limit(4);
        
        if (productData) setProducts(productData);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Pick the first promo to feature
  const featuredPromo = activePromos[0];

  return (
    <div className="w-full space-y-8 p-4">
      
      {/* 1. UPPER BANNER WITH ONE FEATURED DISCOUNT */}
      <div className="bg-[#365314] p-10 rounded-[40px] text-white shadow-lg relative overflow-hidden min-h-[200px] flex items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter text-center md:text-left">
              Find your fresh today! 🍎
            </h1>
            <p className="text-white/70 font-medium text-center md:text-left">
              Exclusive savings for you today.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            {featuredPromo ? (
              <>
                <div className="bg-white text-[#365314] px-8 py-4 rounded-[24px] shadow-2xl flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Featured Code</span>
                  <span className="text-2xl font-black tracking-tighter">{featuredPromo.discountcode}</span>
                  <div className="mt-1 bg-yellow-400 text-[#1a2e05] text-[10px] font-black px-2 py-0.5 rounded-full">
                    {Math.round(featuredPromo.discountpercentage)}% OFF
                  </div>
                </div>
                {/* Redirect Link */}
                {activePromos.length > 1 && (
                  <Link href="/customer/promotions" className="text-xs font-black uppercase tracking-widest text-white/60 hover:text-white underline decoration-white/30 underline-offset-4 transition-all">
                    + {activePromos.length - 1} more rewards. View All →
                  </Link>
                )}
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 rounded-[24px] text-sm font-bold italic">
                {loading ? 'Checking deals...' : 'FRESH25 ✨'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/customer/promotions" className="bg-white p-8 rounded-[32px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
          <div className="text-3xl bg-orange-50 p-4 rounded-3xl">🏷️</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Offers</p>
            <h4 className="text-2xl font-black text-[#1a2e05]">{activePromos.length} ACTIVE</h4>
          </div>
        </Link>
        
        <Link href="/customer/nearest-store" className="bg-white p-8 rounded-[32px] border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
          <div className="text-3xl bg-blue-50 p-4 rounded-3xl">📍</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nearest Store</p>
            <h4 className="text-2xl font-black text-[#1a2e05]">Locate Now</h4>
          </div>
        </Link>
      </div>

      {/* 3. PRODUCTS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-2xl font-black text-[#1a2e05] tracking-tight">Frequently Bought</h3>
          <Link href="/customer/history" className="bg-[#f3f4f1] px-5 py-2.5 rounded-full text-[#365314] font-black text-[10px] uppercase tracking-widest hover:bg-[#365314] hover:text-white transition-all">
            History
          </Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((item) => (
            <div key={item.productid} className="bg-white p-6 rounded-[40px] border border-gray-100 hover:shadow-lg transition-all group">
              <div className="aspect-square bg-[#f3f4f1] rounded-[30px] mb-4 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                {item.categoryid === 1 ? '🥦' : item.categoryid === 2 ? '🥛' : '📦'}
              </div>
              <h4 className="font-black text-[#1a2e05] text-lg leading-tight">{item.productname}</h4>
              <p className="text-[#365314] font-black mt-1">${Number(item.currentprice).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}