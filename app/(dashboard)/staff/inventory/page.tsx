'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function InventoryCheck() {
  const [search, setSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // New State for Proposal Compliance
  const [reason, setReason] = useState('');

  const findInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('storeinventory')
      .select(`
        inventoryid,
        quantity,
        batchid,
        storeid,
        stores (storename),
        batches!inner (
          batchid,
          batchnumber,
          products!inner (
            productid,
            productname,
            productlocations (
              storeshelves (
                shelfnumber,
                storeaisles (aislenumber)
              )
            )
          )
        )
      `)
      .ilike('batches.products.productname', `%${search}%`);
    
    if (error) {
      toast.error("Failed to load shop stock");
    } else {
      setInventoryItems(data || []);
      if (data?.length === 0) toast.error("No stock found in any shop");
    }
    setLoading(false);
  };

  // Requirement: Mandatory Reason Codes & Audit Logging 
  const handleAdjustment = async (type: 'Damage' | 'Return' | 'Theft') => {
    // 1. Double check selection
    if (!selectedItem) return toast.error("Please select a product card first.");
    if (!reason || reason.trim().length < 3) {
      return toast.error("Pro Proposal Rule: You must provide a valid reason for audit logs.");
    }

    setLoading(true);
    const userId = localStorage.getItem('userId');

    try {
      // 2. Insert into stocktransactions (The "Audit Trail" [cite: 24, 56])
      const { error: logError } = await supabase
        .from('stocktransactions')
        .insert([{
          batchid: selectedItem.batchid,
          transactiontype: type, // Ensure this matches your DB Enum ('Damage', 'Return', 'Theft')
          quantity: type === 'Return' ? 1 : -1,
          performedby: userId ? parseInt(userId) : 1,
          notes: `Reason: ${reason} | Shop: ${selectedItem.stores?.storename}`,
          transactiondate: new Date().toISOString()
        }]);

      if (logError) throw logError;

      // 3. Update storeinventory (The "Single Source of Truth" [cite: 10, 58])
      const newQty = type === 'Return' ? selectedItem.quantity + 1 : selectedItem.quantity - 1;
      
      const { error: updateError } = await supabase
        .from('storeinventory')
        .update({ 
          quantity: newQty, 
          updated_at: new Date().toISOString() 
        })
        .eq('inventoryid', selectedItem.inventoryid);

      if (updateError) throw updateError;

      toast.success(`${type} recorded successfully!`);
      setReason(''); // Clear the reason box
      setSelectedItem(null); // Clear selection
      findInventory(); // Refresh the list
      
    } catch (err: any) {
      console.error("Adjustment Error:", err);
      // If this pops up, your Enum in DB might be lowercase or different
      toast.error(`Database Error: ${err.message || 'Check your Enum types'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-32">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-[#263A29]">Operations: Inventory Check</h2>
        <p className="text-gray-500 font-medium italic">Single Source of Truth: Real-time branch stock & locations[cite: 10].</p>
      </header>
      
      <div className="flex gap-4 mb-8">
        <input 
          className="flex-1 p-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#41644A] bg-white shadow-sm"
          placeholder="Search product (e.g. Milk)..."
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findInventory()}
        />
        <button onClick={findInventory} disabled={loading} className="bg-[#41644A] text-white px-10 rounded-2xl font-black uppercase text-xs hover:bg-[#263A29]">
          {loading ? 'Searching...' : 'Search Shops'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inventoryItems.map((item) => (
          <div 
            key={item.inventoryid}
            onClick={() => setSelectedItem(item)}
            className={`p-6 rounded-[35px] border-2 transition-all cursor-pointer ${
              selectedItem?.inventoryid === item.inventoryid ? 'border-[#41644A] bg-green-50' : 'border-white bg-white shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black bg-[#263A29] text-white px-3 py-1 rounded-full uppercase">
                  {item.stores?.storename}
                </span>
                <h3 className="text-xl font-bold text-[#263A29] mt-3">{item.batches?.products?.productname}</h3>
                
                {/* Requirement: Precise Aisle and Shelf Positions  */}
                <div className="mt-3 flex gap-2">
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    AISLE: {item.batches?.products?.productlocations?.[0]?.storeshelves?.storeaisles?.aislenumber || 'N/A'}
                  </span>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    SHELF: {item.batches?.products?.productlocations?.[0]?.storeshelves?.shelfnumber || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-[#41644A]">{item.quantity}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Stock Level</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Requirement: Mandatory Reason Codes Footer  */}
      <div className="fixed bottom-8 left-[300px] right-8 bg-white/90 backdrop-blur-md p-6 rounded-[40px] border border-gray-100 shadow-2xl flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <input 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="MANDATORY: Enter reason for adjustment (e.g. Broken packaging, Customer return)..."
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-[#41644A]"
          />
          <div className="flex gap-2">
            <button onClick={() => handleAdjustment('Damage')} disabled={!selectedItem || !reason} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] border border-red-100 disabled:opacity-30">
              ⚠️ Damage
            </button>
            <button onClick={() => handleAdjustment('Theft')} disabled={!selectedItem || !reason} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-[10px] border border-gray-200 disabled:opacity-30">
              🕵️‍♂️ Theft
            </button>
            <button onClick={() => handleAdjustment('Return')} disabled={!selectedItem || !reason} className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-[10px] border border-blue-100 disabled:opacity-30">
              🔄 Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}