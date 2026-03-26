'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MainPage() {
  const [activeView, setActiveView] = useState<'none' | 'stock' | 'store' | 'aisle'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Initial Load: Trending Items + Sales + Stores
  useEffect(() => {
    async function initData() {
      const { data: prods } = await supabase.from('products').select('*').limit(4);
      const { data: sts } = await supabase.from('stores').select('*');
      const { data: sales } = await supabase.from('orderitems').select('productid, quantity');

      if (prods) {
        const trendingWithSales = prods.map(p => ({
          ...p,
          sold: sales?.filter(s => s.productid === p.productid).reduce((acc, s) => acc + (s.quantity || 0), 0) || 0
        }));
        setTrending(trendingWithSales);
      }
      if (sts) setStores(sts);
    }
    initData();
  }, []);

  // 2. Search Logic: Product + Stock + Store Names + Sales
  const handleViewStock = async (query: string) => {
    setLoading(true);
    setActiveView('stock');
    try {
      const { data: products } = await supabase.from('products').select('*').ilike('productname', `%${query}%`);
      const { data: inv } = await supabase.from('storeinventory').select(`quantity, stores(storename), batches(productid)`);
      const { data: sales } = await supabase.from('orderitems').select('productid, quantity');

      const merged = products?.map(p => {
        const locations = inv?.filter(i => (i.batches as any)?.[0]?.productid === p.productid && i.quantity > 0)
          .map(i => ({ name: (i.stores as any).storename, qty: i.quantity }));
        
        const totalStock = locations?.reduce((acc, l) => acc + l.qty, 0) || 0;
        const totalSold = sales?.filter(s => s.productid === p.productid).reduce((acc, s) => acc + (s.quantity || 0), 0) || 0;

        return { ...p, stock: totalStock, locations: locations || [], sold: totalSold };
      });
      setResults(merged || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="bg-[#41644A] text-white py-2 text-center text-xs font-bold uppercase tracking-widest">⚡ FLASH DEAL: Use code FRESH25</div>

      <nav className="flex justify-between items-center px-10 py-6">
        <div className="flex items-center gap-2 text-2xl font-black text-[#263A29]">
          <div className="w-10 h-10 bg-[#41644A] rounded-xl flex items-center justify-center text-white shadow-lg">g.</div>
          groceria.
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login" className="font-bold text-gray-400 p-3">Sign In</Link>
          <Link href="/auth/register" className="bg-[#41644A] text-white px-8 py-3 rounded-full font-bold shadow-lg">Join Now</Link>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Section */}
        <main className={`transition-all duration-700 p-10 flex flex-col items-center ${activeView !== 'none' ? 'w-1/2 border-r bg-gray-50/20' : 'w-full'}`}>
          <div className="text-center mt-12 mb-10">
            <h1 className="text-6xl font-black text-[#263A29] tracking-tighter mb-4">Find your fresh today.</h1>
            <p className="text-gray-400 font-medium italic">Search for products, stock, or nearest stores.</p>
          </div>

          <div className="w-full max-w-xl relative mb-10">
            <span className="absolute left-6 top-6 text-2xl">🔍</span>
            <input 
              type="text" value={searchQuery || ''} placeholder="Search groceries..."
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleViewStock(searchQuery)}
              className="w-full py-6 pl-16 pr-8 rounded-full border-2 border-gray-100 shadow-2xl text-lg outline-none focus:border-[#41644A]"
            />
          </div>

          <div className="flex gap-4 mb-20">
            <button onClick={() => setActiveView('store')} className="px-8 py-4 bg-white border-2 rounded-2xl font-bold shadow-sm">📍 Nearest Store</button>
            <button onClick={() => handleViewStock(searchQuery)} className="px-8 py-4 bg-[#41644A] text-white rounded-2xl font-bold shadow-lg">🔍 View Stock</button>
          </div>

          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-black text-[#263A29] mb-6">Trending <span className="text-[10px] bg-[#41644A] text-white px-2 py-0.5 rounded uppercase ml-2">Live</span></h2>
            <div className={`grid gap-6 ${activeView !== 'none' ? 'grid-cols-2' : 'grid-cols-4'}`}>
              {trending.map((item, i) => (
                <div key={i} className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm relative overflow-hidden">
                  <div className="text-4xl mb-4">📦</div>
                  <h4 className="font-bold text-[#263A29] truncate">{item.productname}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[#41644A] font-black">${item.currentprice}</p>
                    <p className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">{item.sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        {activeView !== 'none' && (
          <aside className="w-1/2 bg-[#f3f4f1] p-12 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">{activeView} Results</h2>
              <button onClick={() => setActiveView('none')} className="w-10 h-10 bg-white rounded-full shadow-sm font-bold">✕</button>
            </div>

            <div className="space-y-6">
              {activeView === 'stock' && results.map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-[35px] shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-xl text-[#263A29]">{item.productname}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Aisle {item.categoryid}</span>
                        <span className="text-[10px] font-black text-orange-600 uppercase bg-orange-50 px-2 rounded-full">🔥 {item.sold} total sales</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#263A29] leading-none">{item.stock}</p>
                      <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">In Stock</p>
                      <p className="text-lg font-bold text-[#41644A]">${item.currentprice}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t flex flex-wrap gap-2">
                    {item.locations.map((loc: any, idx: number) => (
                      <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-[11px] font-bold text-[#263A29]">
                        {loc.name}: <span className="text-[#41644A]">{loc.qty}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {activeView === 'store' && stores.map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-[30px] shadow-sm mb-4">
                  <h3 className="font-bold text-[#263A29]">{s.storename}</h3>
                  <p className="text-xs text-gray-400">{s.address}</p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}