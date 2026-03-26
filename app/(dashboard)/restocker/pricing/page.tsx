'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function PricingApprovals() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchProducts(); 
  }, []);

  async function fetchProducts() {
    setLoading(true);
    
    // 1. Join with 'batches' to get the remaining quantity for each product
    const { data, error } = await supabase
      .from('products')
      .select(`
        productid, 
        productname, 
        currentprice,
        batches (
          remainingquantity
        )
      `)
      .order('productname', { ascending: true });

    if (error) {
      console.error("DBMS Fetch Error:", error.message);
      setProducts([]);
      toast.error("Schema Sync Failed");
    } else if (data) {
      // 2. Map through products and calculate total stock from batches
      const formattedProducts = data.map((p: any) => {
        const totalStock = p.batches?.reduce(
          (sum: number, batch: any) => sum + (batch.remainingquantity || 0), 
          0
        ) || 0;

        return {
          ...p,
          stockquantity: totalStock // This injects the missing column for your UI
        };
      });

      setProducts(formattedProducts);
    }
    setLoading(false);
  }

  const handlePriceUpdate = async (product: any, newPrice: number) => {
    if (isNaN(newPrice)) {
      toast.error("Invalid price entered");
      return;
    }

    try {
      const { error: priceError } = await supabase
        .from('products')
        .update({ currentprice: newPrice })
        .eq('productid', product.productid);
      
      if (priceError) throw priceError;

      toast.success(`Updated: ${product.productname} is now $${newPrice}`);
      fetchProducts(); // Refresh list to show new price
    } catch (err: any) {
      toast.error("Database Update Failed: " + err.message);
    }
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] uppercase tracking-tighter">Pricing Authority</h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Direct Product Database Access</p>
        </div>
        
        <button 
          onClick={fetchProducts}
          className="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
        >
          Refresh Schema
        </button>
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-gray-300 font-black uppercase tracking-[0.3em]">Querying Products...</div>
        ) : products.length > 0 ? (
          products.map(p => (
            <div key={p.productid} className="bg-white p-8 rounded-[40px] border border-gray-100 flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">SKU: {p.productid}</p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${p.stockquantity > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    Stock: {p.stockquantity}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#263A29]">{p.productname}</h3>
                <div className="flex gap-6 mt-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Current Active Price</span>
                    <span className="text-2xl font-black text-[#263A29] tracking-tighter">${Number(p.currentprice).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const val = prompt(`Enter new price for ${p.productname}:`, p.currentprice);
                    if (val !== null) handlePriceUpdate(p, parseFloat(val));
                  }}
                  className="bg-[#263A29] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Adjust Price
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
            <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No Products Found in DBMS</p>
          </div>
        )}
      </div>
    </div>
  );
}