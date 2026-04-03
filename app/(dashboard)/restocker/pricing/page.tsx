'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Search, Package, DollarSign, Edit3, Tag } from 'lucide-react';

export default function PricingApprovals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initial Load (Show a few products or nothing until search)
  useEffect(() => {
    handleSearch('');
  }, []);

  async function handleSearch(query: string) {
    try {
      setLoading(true);
      
      // 1. Build Query: Link products with batches to sum remainingqty
      let dbQuery = supabase
        .from('products')
        .select(`
          productid, 
          name, 
          currentprice,
          batches (remainingqty)
        `);

      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }

      const { data, error } = await dbQuery.limit(10).order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        // 2. Calculate stock levels from batch array
        const formatted = data.map((p: any) => ({
          ...p,
          totalStock: p.batches?.reduce((sum: number, b: any) => sum + (b.remainingqty || 0), 0) || 0
        }));
        setProducts(formatted);
      }
    } catch (err: any) {
      console.error("Search Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on input change
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePriceUpdate = async (product: any) => {
    const newVal = prompt(`Enter new price for ${product.name}:`, product.currentprice);
    if (newVal === null) return;
    
    const newPrice = parseFloat(newVal);
    if (isNaN(newPrice) || newPrice < 0) return toast.error("Invalid price");

    try {
      const { error } = await supabase
        .from('products')
        .update({ currentprice: newPrice })
        .eq('productid', product.productid);
      
      if (error) throw error;

      toast.success("Database Updated Successfully");
      handleSearch(searchTerm); // Refresh the current view
    } catch (err: any) {
      toast.error("Update Failed: " + err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] uppercase tracking-tighter flex items-center gap-3">
             Pricing Authority
          </h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Search Catalog & Adjust Active Market Prices</p>
        </div>
      </header>

      {/* SEARCH INTERFACE */}
      <div className="relative group" ref={searchRef}>
        <div className="bg-white p-2 rounded-[35px] border border-gray-100 shadow-xl flex items-center transition-all focus-within:ring-4 focus-within:ring-[#41644A]/10">
            <div className="p-4 text-[#41644A]"><Search size={24} /></div>
            <input 
                type="text"
                placeholder="Search by product name..."
                className="flex-1 bg-transparent border-none outline-none p-4 font-bold text-[#263A29] placeholder:text-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-4 text-gray-300 hover:text-red-400 transition-colors">
                    <Edit3 size={18} />
                </button>
            )}
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
           <div className="col-span-full py-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-widest italic">
             Searching Product Master...
           </div>
        ) : products.length > 0 ? (
          products.map(p => (
            <div key={p.productid} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FBFBFB] rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div className="p-4 bg-[#f3f4f1] rounded-2xl text-[#263A29]">
                     <Package size={24} />
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global SKU</p>
                      <p className="font-mono text-xs font-bold text-[#41644A]">#{p.productid}</p>
                   </div>
                </div>

                <h3 className="text-2xl font-black text-[#263A29] mb-4">{p.name}</h3>

                <div className="flex items-center gap-6 pt-6 border-t border-gray-50">
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Price</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[#263A29] tracking-tighter">${Number(p.currentprice).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm ${
                           p.totalStock > 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                         }`}>
                           Stock: {p.totalStock}
                         </span>
                    </div>
                </div>

                <button 
                  onClick={() => handlePriceUpdate(p)}
                  className="w-full mt-8 py-5 bg-[#263A29] text-white rounded-[25px] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg hover:bg-black active:scale-95 transition-all"
                >
                  Adjust Price Points
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-gray-50 rounded-[50px] border-2 border-dashed border-gray-200">
             <Tag className="mx-auto text-gray-200 mb-4" size={48} />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products found matching your query</p>
          </div>
        )}
      </div>
    </div>
  );
}