'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Package, MapPin, Star, X, Trash2 } from 'lucide-react';

export default function SearchStockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);

  // 1. INITIAL LOAD (Stores, Discounts, Local Cart)
  useEffect(() => {
    async function init() {
      const { data: storeData } = await supabase.from('stores').select('storeid, storename');
      if (storeData) setStores(storeData);

      const { data: discountData } = await supabase.from('discounts').select('*').eq('status', 'active').limit(1);
      if (discountData?.[0]) setActiveDiscount(discountData[0]);

      const { data: user } = await supabase.from('customers').select('customerid').limit(1).single();
      if (user) setCustomerId(user.customerid);

      // Load saved cart from memory
      const savedCart = localStorage.getItem('active_cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    }
    init();
  }, []);

  // 2. SAVE CART TO MEMORY
  useEffect(() => {
    localStorage.setItem('active_cart', JSON.stringify(cart));
  }, [cart]);

  // 3. FETCH INVENTORY
  useEffect(() => {
    async function fetchStoreData() {
      try {
        setLoading(true);
        const { data: productsData } = await supabase.from('products').select(`
            productid, productname, currentprice, 
            productlocations (storeshelves (shelfnumber, storeaisles (aislenumber)))
          `);

        let invQuery = supabase.from('storeinventory').select('quantity, storeid, batches(productid)');
        if (selectedStore !== 'ALL') invQuery = invQuery.eq('storeid', selectedStore);
        const { data: invData } = await invQuery;

        const merged = productsData?.map((product: any) => {
          const productInv = invData?.filter((inv: any) => inv.batches?.productid === product.productid) || [];
          const totalStock = productInv.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const location = product.productlocations?.[0]?.storeshelves;
          
          return { 
            ...product, 
            totalStock,
            aisle: location?.storeaisles?.aislenumber || 'N/A',
            shelf: location?.shelfnumber || 'N/A'
          };
        }).filter(p => p.totalStock > 0);

        setProducts(merged || []);
      } finally { setLoading(false); }
    }
    if (stores.length > 0) fetchStoreData();
  }, [selectedStore, stores]);

  // CART LOGIC
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productid === product.productid);
    if (existing) {
      setCart(cart.map(item => item.productid === product.productid ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    toast.success(`${product.productname} added to trip`);
  };

  const removeFromCart = (id: number) => setCart(cart.filter(item => item.productid !== id));

  const filteredProducts = products.filter(item => item.productname?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative min-h-screen bg-[#FBFBFB] p-4 md:p-8">
      
      {/* --- CART OVERLAY SIDEBAR --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-[#263A29]">YOUR TRIP</h2>
              <button onClick={() => setIsCartOpen(false)}><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 && <p className="text-gray-400 italic text-center py-10">Your list is empty.</p>}
              {cart.map(item => (
                <div key={item.productid} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <p className="font-bold text-[#263A29]">{item.name || item.productname}</p>
                    <p className="text-[10px] font-black text-[#41644A]">AISLE {item.aisle} • QTY: {item.qty}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.productid)} className="text-red-400"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between mb-4 font-black text-[#263A29]">
                <span>TOTAL ESTIMATE</span>
                <span>${cart.reduce((sum, i) => sum + (i.currentprice * i.qty), 0).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => window.location.href = customerId ? '/customer/checkout' : '/visitor/checkout'}
                className="w-full bg-[#263A29] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#41644A] transition-all"
              >
                Confirm Pickup Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAGE HEADER --- */}
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-[#263A29] tracking-tighter">SMART SEARCH</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Find inventory & build your list</p>
          </div>
          
          {/* FLOATING CART ICON */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hover:scale-105 transition-transform"
          >
            <ShoppingCart className="text-[#263A29]" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-[#FBFBFB]">
                {cart.reduce((sum, i) => sum + i.qty, 0)}
              </span>
            )}
          </button>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 bg-white p-2 rounded-[30px] shadow-sm border border-gray-100 flex items-center">
            <span className="pl-6 text-xl">🔍</span>
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="What are you looking for today?" 
              className="w-full px-4 py-4 bg-transparent outline-none font-bold text-[#263A29]"
            />
          </div>
          <div className="md:col-span-4">
            <select 
              value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full h-full px-6 py-4 bg-white border border-gray-100 rounded-[30px] font-black text-[10px] uppercase tracking-widest text-[#263A29] shadow-sm outline-none cursor-pointer"
            >
              <option value="ALL">All Branches (Global Search)</option>
              {stores.map(s => <option key={s.storeid} value={s.storeid}>{s.storename}</option>)}
            </select>
          </div>
        </div>

        {/* PRODUCT GRID */}
        {loading ? (
          <div className="py-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest">Updating Stock Levels...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((item) => (
              <div key={item.productid} className="p-8 bg-white border border-gray-100 rounded-[40px] shadow-sm hover:shadow-2xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <div className="bg-green-50 px-3 py-1 rounded-full text-[9px] font-black text-green-600 uppercase">
                    {item.totalStock} in stock
                  </div>
                </div>

                <h4 className="font-black text-xl text-[#263A29]">{item.productname}</h4>
                <p className="text-[#41644A] font-black text-2xl mt-1">${item.currentprice}</p>
                
                <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase">Aisle {item.aisle}</p>
                    <p className="text-[8px] font-black text-gray-400 uppercase">Shelf {item.shelf}</p>
                  </div>
                  <button 
                    onClick={() => addToCart(item)}
                    className="bg-[#263A29] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#41644A] active:scale-95 transition-all"
                  >
                    Add to Trip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}