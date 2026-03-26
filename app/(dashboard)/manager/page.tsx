'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function StockAdjustments() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [reason, setReason] = useState('damaged'); // Mandatory Reason Codes
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mandatory Reason Codes from Project Proposal
  const reasonCodes = [
    { id: 'damaged', label: '📦 Damaged Goods' },
    { id: 'theft', label: '🕵️‍♂️ Theft/Loss' },
    { id: 'expired', label: '🤢 Expired' },
    { id: 'correction', label: '⚙️ System Correction' }
  ];

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data } = await supabase
      .from('batches')
      .select(`
        batchid, batchnumber, remainingquantity,
        products (productname)
      `)
      .gt('remainingquantity', 0)
      .order('batchid', { ascending: false });
    setBatches(data || []);
  }

  const handleAdjust = async () => {
    if (!selectedBatch || adjustmentQty === 0) return toast.error("Select batch and quantity");
    setIsSubmitting(true);

    try {
      // 1. Calculate new quantity
      const newQty = selectedBatch.remainingquantity - adjustmentQty;
      if (newQty < 0) throw new Error("Cannot adjust below zero");

      // 2. Update Batches table
      const { error: updateError } = await supabase
        .from('batches')
        .update({ remainingquantity: newQty })
        .eq('batchid', selectedBatch.batchid);

      if (updateError) throw updateError;

      // 3. LOG THE ADJUSTMENT (Important for Audit Logs page later)
      // Note: Assuming you have a 'stockadjustmentlogs' table or similar
      await supabase.from('auditlogs').insert([{
        action: 'STOCK_ADJUSTMENT',
        details: `Batch ${selectedBatch.batchnumber}: Removed ${adjustmentQty} due to ${reason}`,
        adminid: 1 // Manager ID
      }]);

      toast.success("Inventory Adjusted & Logged");
      setAdjustmentQty(0);
      setSelectedBatch(null);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-[#263A29]">Stock Adjustments</h1>
        <p className="text-gray-500">Manual inventory overrides with mandatory audit tracking.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Step 1: Select Batch */}
        <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">1. Select Batch</label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {batches.map(b => (
              <div 
                key={b.batchid}
                onClick={() => setSelectedBatch(b)}
                className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                  selectedBatch?.batchid === b.batchid 
                  ? 'border-[#41644A] bg-green-50' 
                  : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="font-bold text-[#263A29]">{b.products.productname}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-gray-400 font-mono">{b.batchnumber}</span>
                  <span className="text-xs font-black">Stock: {b.remainingquantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Reason & Action */}
        <div className="space-y-6">
          <div className="bg-[#263A29] p-8 rounded-[40px] text-white">
            <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">2. Adjustment Details</label>
            
            <div className="mb-6">
              <p className="text-xs mb-2 opacity-80">Reason Code</p>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm outline-none focus:bg-white/20 transition-all"
              >
                {reasonCodes.map(r => <option key={r.id} value={r.id} className="text-black">{r.label}</option>)}
              </select>
            </div>

            <div className="mb-8">
              <p className="text-xs mb-2 opacity-80">Quantity to Remove</p>
              <input 
                type="number"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-2xl font-black outline-none focus:bg-white/20 transition-all"
                placeholder="0"
              />
            </div>

            <button 
              onClick={handleAdjust}
              disabled={isSubmitting || !selectedBatch}
              className="w-full py-4 bg-white text-[#263A29] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all disabled:opacity-30"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Adjustment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}