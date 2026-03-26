'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function UnifiedShoppingPage() {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [dailyList, setDailyList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      // 1. Get Customer ID
      const { data: customer } = await supabase.from('customers').select('customerid').limit(1).single();
      if (customer) {
        setCustomerId(customer.customerid);
        fetchWishlist(customer.customerid);
      }

      // 2. Load Daily Trip from Browser Memory
      const saved = localStorage.getItem('shopping_list');
      if (saved) setDailyList(JSON.parse(saved));
    }
    init();

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // RESTORED: Smart Search Logic
  useEffect(() => {
    const searchDb = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      const { data } = await supabase
        .from('products')
        .select(`
          productid, 
          productname, 
          currentprice,
          productlocations(storeshelves(shelfnumber, storeaisles(aislenumber)))
        `)
        .ilike('productname', `%${searchTerm}%`)
        .limit(5);
      
      setSuggestions(data || []);
    };

    const timer = setTimeout(searchDb, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Save Daily Trip to LocalStorage
  useEffect(() => {
  // Only save if there's actually something to save
  if (dailyList.length > 0) {
    localStorage.setItem('shopping_list', JSON.stringify(dailyList));
  }
}, [dailyList]);

  async function fetchWishlist(cId: number) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('customerwishlists')
        .select(`wishlistid, productid, products (productname, currentprice, productlocations (storeshelves (shelfnumber, storeaisles (aislenumber))))`)
        .eq('customerid', cId);

      if (!data) return;

      const productIds = data.map(item => item.productid);
      const { data: invData } = await supabase
        .from('storeinventory').select('quantity, batches(productid)')
        .in('batches.productid', productIds);

      const formatted = data.map(item => {
        const stock = invData?.filter(inv => inv.batches?.productid === item.productid)
                              .reduce((sum, inv) => sum + inv.quantity, 0) || 0;
        const loc = item.products?.productlocations?.[0]?.storeshelves;
        return {
          wishlistId: item.wishlistid,
          productId: item.productid,
          name: item.products?.productname,
          price: item.products?.currentprice,
          stock: stock,
          aisle: loc?.storeaisles?.aislenumber || 'N/A'
        };
      });

      setWishlist(formatted);
    } finally {
      setLoading(false);
    }
  }

  const addToDaily = (product: any) => {
    const pId = product.productid || product.productId;
    const isWishlist = wishlist.find(w => w.productId === pId);
    
    // Extract location safely
    const locAisle = product.aisle || product.productlocations?.[0]?.storeshelves?.storeaisles?.aislenumber || 'N/A';

    const newItem = {
      uid: Date.now(),
      id: pId,
      name: product.productname || product.name,
      aisle: locAisle,
      checked: false,
      isFromWishlist: !!isWishlist
    };

    setDailyList([newItem, ...dailyList]);
    setSearchTerm('');
    setShowSuggestions(false);
    toast.success("Added to trip!");
  };

  const toggleWishlist = async (product: any) => {
    if (!customerId) return;
    const pId = product.productid || product.productId || product.id;
    const existing = wishlist.find(w => w.productId === pId);

    if (existing) {
      await supabase.from('customerwishlists').delete().eq('wishlistid', existing.wishlistId);
      setWishlist(prev => prev.filter(w => w.productId !== pId));
      toast.error("Alert Disabled");
    } else {
      const { data, error } = await supabase
        .from('customerwishlists')
        .insert({ customerid: customerId, productid: pId })
        .select()
        .single();
      
      if (!error) {
        fetchWishlist(customerId);
        toast.success("Monitoring for restock!");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-10 bg-[#FBFBFB] min-h-screen">
      
      {/* 1. HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#263A29] tracking-tight">Daily Trip</h1>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Aisle-by-aisle navigation</p>
        </div>
        <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase">Items</p>
                <p className="text-xl font-black text-[#263A29]">{dailyList.length}</p>
            </div>
            <div className="bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-black text-orange-400 uppercase">Watchlist</p>
                <p className="text-xl font-black text-orange-600">{wishlist.length}</p>
            </div>
        </div>
      </header>

      {/* 2. SEARCH & QUICK ADD */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          {/* RESTORED: Search Input with Suggestions Overlay */}
          <div className="relative" ref={searchRef}>
            <input 
              type="text"
              value={searchTerm}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search store catalog..."
              className="w-full p-6 bg-white rounded-[30px] shadow-sm border-2 border-transparent focus:border-[#41644A] outline-none font-bold text-[#263A29] transition-all"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden">
                {suggestions.map(p => (
                  <div key={p.productid} className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-50 last:border-none">
                    <div className="flex-1">
                      <p className="font-bold text-[#263A29] text-sm">{p.productname}</p>
                      <p className="text-[10px] font-black text-[#41644A] uppercase tracking-tighter">
                        Aisle {p.productlocations?.[0]?.storeshelves?.storeaisles?.aislenumber || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleWishlist(p)} 
                        className={`p-2 text-xl transition-transform active:scale-125 ${wishlist.some(w => w.productId === p.productid) ? 'text-yellow-400' : 'text-gray-200 hover:text-gray-400'}`}
                      >
                        ★
                      </button>
                      <button 
                        onClick={() => addToDaily(p)} 
                        className="bg-[#263A29] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK-ADD FROM WISHLIST */}
          <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Quick Add from Watchlist</h3>
            <div className="space-y-3">
              {wishlist.length === 0 && <p className="text-sm text-gray-300 italic">No items being watched.</p>}
              {wishlist.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl group">
                  <span className="font-bold text-sm text-[#263A29]">{item.name}</span>
                  <div className="flex items-center gap-2">
                    {item.stock > 0 ? (
                        <button onClick={() => addToDaily(item)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Restocked! Add</button>
                    ) : (
                        <span className="text-[9px] font-black text-orange-400 uppercase bg-orange-50 px-2 py-1 rounded-lg">Out of stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. THE MASTER LIST */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center px-4">
             <h2 className="font-black text-[#263A29] uppercase tracking-widest text-xs">Trip Overview</h2>
             <button onClick={() => { if(confirm("Clear Trip?")) setDailyList([]); }} className="text-red-400 text-[10px] font-black uppercase hover:underline">Clear List</button>
          </div>

          {dailyList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
               <p className="text-gray-400 font-bold">Your shopping trip is empty</p>
               <p className="text-gray-300 text-xs mt-1">Search or add from your watchlist above</p>
            </div>
          ) : (
            dailyList.map(item => (
              <div key={item.uid} className={`group flex items-center justify-between p-6 rounded-[30px] border-2 transition-all ${item.checked ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-white shadow-sm hover:border-gray-100'}`}>
                <div className="flex items-center gap-5 flex-1">
                  <div className="relative">
                    <input 
                        type="checkbox" 
                        checked={item.checked} 
                        onChange={() => setDailyList(dailyList.map(i => i.uid === item.uid ? {...i, checked: !i.checked} : i))}
                        className="w-7 h-7 rounded-full border-2 border-gray-200 accent-[#41644A] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <h4 className={`text-lg font-black ${item.checked ? 'line-through text-gray-400' : 'text-[#263A29]'}`}>{item.name}</h4>
                        {wishlist.find(w => w.productId === item.id)?.stock > 0 && (
                            <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase animate-pulse">Ready to Pick</span>
                        )}
                        {wishlist.find(w => w.productId === item.id)?.stock === 0 && (
                            <span className="bg-orange-50 text-orange-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Watching Stock</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black bg-[#F7F9F7] text-[#41644A] px-3 py-1 rounded-full uppercase tracking-widest">📍 Aisle {item.aisle}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => toggleWishlist(item)} className={`text-xl transition-transform active:scale-125 ${wishlist.some(w => w.productId === item.id) ? 'text-yellow-400' : 'text-gray-100 hover:text-gray-300'}`}>
                        ★
                    </button>
                    <button onClick={() => setDailyList(dailyList.filter(i => i.uid !== item.uid))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all font-bold p-2">✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}