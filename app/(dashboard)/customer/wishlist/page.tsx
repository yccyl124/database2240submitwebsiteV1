'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWishlist();
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchWishlist() {
    // 1. Get current user ID from LocalStorage (consistent with your other pages)
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) return;

    // 2. Fetch from 'user_collections' where type is 'wishlist'
    const { data, error } = await supabase
      .from('user_collections')
      .select(`
        collectionid, 
        productid, 
        products (
          name, 
          currentprice, 
          store_layouts (aisle_number)
        )
      `)
      .eq('userid', parseInt(storedUserId))
      .eq('list_type', 'wishlist');

    if (error) {
      console.error("Wishlist fetch error:", error.message);
      return;
    }
    
    if (!data || data.length === 0) {
        setWishlist([]);
        return;
    }

    // 3. Check Inventory (via batches link)
    const productIds = data.map(item => item.productid);
    const { data: invData } = await supabase
      .from('inventory')
      .select('quantity, batches!inner(productid)')
      .in('batches.productid', productIds);

    const formatted = data.map(item => {
      const productObj: any = item.products;
      
      // Aggregate stock from all batches of this product
      const stock = invData
        ?.filter((inv: any) => inv.batches?.productid === item.productid)
        .reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0;
      
      const layoutObj = productObj?.store_layouts?.[0];

      return {
        id: item.collectionid,
        productId: item.productid,
        name: productObj?.name || 'Unknown Product',
        price: productObj?.currentprice,
        stock: stock,
        aisle: layoutObj?.aisle_number || 'N/A'
      };
    });
    setWishlist(formatted);
  }

  const toggleWishlist = async (pId: number) => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) return;
    
    const existing = wishlist.find(w => w.productId === pId);

    if (existing) {
      // Remove from wishlist
      await supabase.from('user_collections')
        .delete()
        .eq('collectionid', existing.id);
      
      setWishlist(prev => prev.filter(w => w.productId !== pId));
      toast.error("Alert Disabled");
    } else {
      // Add to wishlist
      const { error } = await supabase.from('user_collections').insert({ 
        userid: parseInt(storedUserId), 
        productid: pId, 
        list_type: 'wishlist',
        quantity: 1 
      });
      
      if (!error) {
          fetchWishlist();
          toast.success("Monitoring for restock!");
      } else {
          toast.error("Could not add to wishlist");
      }
    }
  };

  useEffect(() => {
    const searchDb = async () => {
      if (searchTerm.length < 2) { setSuggestions([]); return; }
      const { data } = await supabase
        .from('products')
        .select(`productid, name`)
        .ilike('name', `%${searchTerm}%`)
        .limit(5);
      
      setSuggestions(data || []);
    };
    const timer = setTimeout(searchDb, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 bg-[#FFFBF7] min-h-screen">
      <header>
        <h1 className="text-4xl font-black text-[#263A29]">Restock Alerts</h1>
        <p className="text-orange-500 font-bold text-xs uppercase tracking-widest">We'll notify you when these return</p>
      </header>

      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <input 
          type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowSuggestions(true)}
          placeholder="Search items to monitor..."
          className="w-full p-6 bg-white rounded-[30px] shadow-sm border-2 border-transparent focus:border-orange-400 outline-none font-bold text-[#263A29]"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden">
            {suggestions.map(p => (
              <div key={p.productid} className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-50">
                <span className="font-bold text-[#263A29]">{p.name}</span>
                <button onClick={() => toggleWishlist(p.productid)} className={`text-2xl ${wishlist.some(w => w.productId === p.productid) ? 'text-yellow-400' : 'text-gray-200 hover:text-gray-400'}`}>★</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wishlist.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group">
            <div>
              <h4 className="font-black text-[#263A29]">{item.name}</h4>
              <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md inline-block mt-2 ${item.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-400'}`}>
                {item.stock > 0 ? `In Stock (Aisle ${item.aisle})` : 'Out of Stock'}
              </div>
            </div>
            <button onClick={() => toggleWishlist(item.productId)} className="text-gray-200 group-hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}
        
        {wishlist.length === 0 && !searchTerm && (
          <div className="col-span-full py-20 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic">Your alert list is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}