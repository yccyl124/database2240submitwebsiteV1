'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Search, AlertCircle, Box, Archive } from 'lucide-react';

export default function InventoryCheck() {
  const [search, setSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [reason, setReason] = useState('');

  const findInventory = async () => {
    if (!search.trim()) return toast.error("Enter a product name to search");
    
    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          inventoryid,
          quantity,
          batchid,
          locationid,
          locations (name),
          batches!inner (
            batchid,
            batchnumber,
            productid,
            products!inner (
              productid,
              name,
              store_layouts (
                aisle_number,
                shelf_number,
                locationid
              )
            )
          )
        `)
        .ilike('batches.products.name', `%${search}%`);
      
      if (error) throw error;

      // Filter the layout to match the current shop location
      const formatted = data?.map(item => {
        const product = item.batches?.products;
        const correctLayout = product?.store_layouts?.find((l: any) => l.locationid === item.locationid);
        return { ...item, layout: correctLayout };
      });

      setInventoryItems(formatted || []);
    } catch (err) {
      toast.error("Failed to sync with warehouse database");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (type: 'Damage' | 'Return' | 'Theft') => {
    if (!selectedItem) return toast.error("Please select a product card first.");
    if (!reason || reason.trim().length < 3) {
      return toast.error("Pro Proposal Rule: Mandatory reason required for audit logs.");
    }

    setLoading(true);
    const userId = localStorage.getItem('userId');

    try {
      // 1. Log to stock_movements (Audit Trail)
      const { error: logError } = await supabase
        .from('stock_movements')
        .insert([{
          batchid: selectedItem.batchid,
          transactiontype: type.toLowerCase(), 
          quantity: 1,
          performedby: userId ? parseInt(userId) : 1,
          notes: `Reason: ${reason} | Manual Overide`,
          transactiondate: new Date().toISOString()
        }]);

      if (logError) throw logError;

      // 2. Update inventory (Single Source of Truth)
      const newQty = type === 'Return' ? selectedItem.quantity + 1 : selectedItem.quantity - 1;
      
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQty, last_updated: new Date().toISOString() })
        .eq('inventoryid', selectedItem.inventoryid);

      if (updateError) throw updateError;

      toast.success(`${type} recorded successfully!`);
      setReason('');
      setSelectedItem(null);
      findInventory();
      
    } catch (err: any) {
      toast.error(`Database Sync Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-40">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Inventory Intelligence</h2>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 leading-relaxed">
          Real-time branch synchronization & precise shelf mapping
        </p>
      </header>
      
      <div className="flex gap-4 mb-10">
        <div className="relative flex-1">
          <input 
            className="w-full p-5 pl-14 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#41644A] bg-white shadow-sm font-bold text-[#263A29] placeholder:text-gray-300"
            placeholder="Search catalog by name (e.g. Milk, Apples)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findInventory()}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={24} />
        </div>
        <button onClick={findInventory} disabled={loading} className="bg-[#41644A] text-white px-12 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#263A29] transition-all shadow-lg active:scale-95">
          {loading ? 'Syncing...' : 'Search'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventoryItems.map((item) => (
          <div 
            key={item.inventoryid}
            onClick={() => setSelectedItem(item)}
            className={`p-8 rounded-[45px] border-2 transition-all cursor-pointer group relative overflow-hidden ${
              selectedItem?.inventoryid === item.inventoryid ? 'border-[#41644A] bg-green-50 shadow-xl' : 'border-white bg-white shadow-sm hover:border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="flex-1">
                <span className="text-[10px] font-black bg-[#263A29] text-white px-4 py-1.5 rounded-full uppercase tracking-widest">
                  {item.locations?.name}
                </span>
                <h3 className="text-2xl font-black text-[#263A29] mt-5 leading-tight">{item.batches?.products?.name}</h3>
                <p className="text-[10px] font-mono text-gray-400 font-bold uppercase mt-1">Batch: #{item.batches?.batchnumber}</p>
                
                <div className="mt-5 flex gap-3">
                  <div className="bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <Archive size={12} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-600 uppercase">Aisle {item.layout?.aisle_number || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <Box size={12} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-600 uppercase">Shelf {item.layout?.shelf_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-5xl font-black text-[#41644A] tracking-tighter">{item.quantity}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Units In Stock</p>
              </div>
            </div>
          </div>
        ))}

        {/* NOT FOUND MESSAGE - REMAINS IN GRID FORMAT */}
        {hasSearched && !loading && inventoryItems.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[45px] border-2 border-dashed border-gray-100 shadow-inner">
            <AlertCircle className="mx-auto text-gray-200 mb-4" size={64} />
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">No Match Found</h3>
            <p className="text-gray-300 font-bold text-xs uppercase mt-2 tracking-widest">
              "{search}" does not exist in any branch or batch.
            </p>
            <button onClick={() => setSearch('')} className="mt-6 text-[10px] font-black text-[#41644A] underline uppercase tracking-widest">Clear and try again</button>
          </div>
        )}
      </div>

      {/* MANDATORY REASON FOOTER */}
      <div className="fixed bottom-8 left-[320px] right-8 bg-white/95 backdrop-blur-xl p-8 rounded-[45px] border border-gray-100 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.15)] flex flex-col gap-5 z-50">
        <div className="flex gap-4 items-center">
          <input 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="MANDATORY: Describe why stock is changing (e.g. Broken packaging, Customer return)..."
            className="flex-1 p-5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#41644A] text-[#263A29] placeholder:text-gray-300"
          />
          <div className="flex gap-3 shrink-0">
            <button onClick={() => handleAdjustment('Damage')} disabled={!selectedItem || !reason} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-red-100 hover:bg-red-100 transition-all disabled:opacity-20 active:scale-95">
              ⚠️ Damage
            </button>
            <button onClick={() => handleAdjustment('Theft')} disabled={!selectedItem || !reason} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-gray-200 hover:bg-gray-200 transition-all disabled:opacity-20 active:scale-95">
              🕵️‍♂️ Theft
            </button>
            <button onClick={() => handleAdjustment('Return')} disabled={!selectedItem || !reason} className="px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-20 active:scale-95">
              🔄 Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}