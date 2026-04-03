'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Search, X, Package, AlertTriangle, Layers } from 'lucide-react';

export default function StockAdjustments() {
  // Search & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  // Form State
  const [adjustmentQty, setAdjustmentQty] = useState<number | string>(0);
  const [reason, setReason] = useState('damaged'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const reasonCodes = [
    { id: 'damaged', label: '📦 Damaged Goods' },
    { id: 'theft', label: '🕵️‍♂️ Theft/Loss' },
    { id: 'expired', label: '🤢 Expired' },
    { id: 'correction', label: '⚙️ System Correction' }
  ];

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time Product Search
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

  // Fetch batches when a product is selected
  const handleProductSelect = async (product: any) => {
    setSelectedProduct(product);
    setShowSuggestions(false);
    setSelectedBatch(null);

    const { data } = await supabase
      .from('batches')
      .select('batchid, batchnumber, remainingqty, expirydate')
      .eq('productid', product.productid)
      .gt('remainingqty', 0)
      .order('expirydate', { ascending: true });

    setProductBatches(data || []);
  };

  const handleAdjust = async () => {
    const qty = typeof adjustmentQty === 'string' ? parseInt(adjustmentQty) : adjustmentQty;
    if (!selectedBatch || isNaN(qty) || qty <= 0) return toast.error("Select batch and valid quantity");
    
    const managerId = localStorage.getItem('userId');
    if (!managerId) return toast.error("Please log in again.");

    setIsSubmitting(true);

    try {
      const oldQty = selectedBatch.remainingqty;
      const newQty = oldQty - qty;
      if (newQty < 0) throw new Error("Adjustment exceeds current stock.");

      // 1. Update Inventory
      const { error: updateError } = await supabase
        .from('batches')
        .update({ remainingqty: newQty })
        .eq('batchid', selectedBatch.batchid);

      if (updateError) throw updateError;

      // 2. Log Movement
      await supabase.from('stock_movements').insert([{
        batchid: selectedBatch.batchid,
        transactiontype: 'adjustment',
        quantity: qty,
        performedby: parseInt(managerId),
        notes: `Reason: ${reason}`
      }]);

      // 3. Log Audit
      await supabase.from('auditlogs').insert([{
        tablename: 'batches',
        recordid: selectedBatch.batchid,
        operation: 'STOCK_DEDUCTION',
        oldvalues: { remainingqty: oldQty },
        newvalues: { remainingqty: newQty, reason: reason },
        changedby: parseInt(managerId)
      }]);

      toast.success("Inventory override complete");
      setAdjustmentQty(0);
      setSelectedBatch(null);
      setSelectedProduct(null);
      setSearchTerm('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Inventory Overrides</h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Search product and select batch to adjust stock</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: SELECTION FLOW */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* SEARCH BOX */}
          <div className="relative" ref={searchRef}>
            <label className="text-[10px] font-black uppercase text-gray-400 mb-3 block tracking-widest">1. Search Product</label>
            {!selectedProduct ? (
              <div className="relative">
                <input 
                  type="text"
                  className="w-full bg-white border border-gray-100 p-5 rounded-[25px] shadow-sm outline-none focus:border-[#41644A] transition-all font-bold text-[#263A29]"
                  placeholder="Type product name..."
                  value={searchTerm}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-6 top-6 text-gray-300" size={20} />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                    {suggestions.map(p => (
                      <div 
                        key={p.productid}
                        onClick={() => handleProductSelect(p)}
                        className="p-5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 flex items-center gap-4"
                      >
                        <div className="p-2 bg-[#f3f4f1] rounded-lg text-[#263A29]"><Package size={16}/></div>
                        <span className="font-bold text-[#263A29] text-sm">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#263A29] p-5 rounded-[25px] flex justify-between items-center text-white shadow-lg animate-in zoom-in">
                <div className="flex items-center gap-4">
                    <Package className="opacity-50" />
                    <div>
                        <p className="text-[9px] font-black uppercase opacity-50">Selected Target</p>
                        <p className="font-black text-sm">{selectedProduct.name}</p>
                    </div>
                </div>
                <button onClick={() => { setSelectedProduct(null); setProductBatches([]); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* BATCH SELECTOR (Only shows if product selected) */}
          {selectedProduct && (
            <div className="animate-in slide-in-from-top duration-500">
                <label className="text-[10px] font-black uppercase text-gray-400 mb-3 block tracking-widest">2. Select Specific Batch</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {productBatches.length > 0 ? productBatches.map(b => (
                        <div 
                            key={b.batchid}
                            onClick={() => setSelectedBatch(b)}
                            className={`p-5 rounded-2xl cursor-pointer border-2 transition-all flex justify-between items-center ${
                                selectedBatch?.batchid === b.batchid ? 'border-[#41644A] bg-green-50 shadow-md' : 'border-transparent bg-white shadow-sm hover:border-gray-200'
                            }`}
                        >
                            <div>
                                <p className="font-black text-[#263A29] text-xs">Batch #{b.batchnumber}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Expires: {b.expirydate || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-[#41644A]">{b.remainingqty}</p>
                                <p className="text-[8px] font-black text-gray-300 uppercase">In Stock</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Layers className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-400 font-bold text-xs uppercase">No active batches found</p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>

        {/* RIGHT: ADJUSTMENT FORM */}
        <div className="lg:col-span-6">
          <div className={`bg-white p-10 rounded-[45px] border border-gray-100 shadow-2xl space-y-8 transition-all ${!selectedBatch ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#263A29]">3. Action Details</h3>
            
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Reason Code</p>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#41644A]"
              >
                {reasonCodes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Units to Remove</p>
              <input 
                type="number"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-[#f3f4f1] border-none rounded-2xl p-5 text-4xl font-black outline-none focus:ring-2 focus:ring-[#41644A] text-[#263A29]"
                placeholder="0"
              />
              {selectedBatch && (
                 <p className="mt-3 text-[10px] font-bold text-red-400 uppercase flex items-center gap-2">
                    <AlertTriangle size={12} /> Remaining stock after action: {selectedBatch.remainingqty - Number(adjustmentQty || 0)}
                 </p>
              )}
            </div>

            <button 
              onClick={handleAdjust}
              disabled={isSubmitting || !selectedBatch}
              className="w-full py-6 bg-[#263A29] text-white rounded-[30px] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#41644A] shadow-xl active:scale-95 transition-all"
            >
              {isSubmitting ? 'Processing Audit...' : 'Execute Stock Deduction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}