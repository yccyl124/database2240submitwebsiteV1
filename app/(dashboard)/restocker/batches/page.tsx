'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function BatchManagement() {
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [newBatch, setNewBatch] = useState({
    productid: '',
    batchnumber: '',
    expirydate: '',
    initialquantity: 0,
    costperunit: 0
  });

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('productid, productname');
    if (data) setProducts(data);
  }

  async function fetchBatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from('batches')
      .select(`
        batchid,
        batchnumber,
        expirydate,
        initialquantity,
        remainingquantity,
        costperunit,
        productid,
        products (productname)
      `)
      .order('expirydate', { ascending: true });

    if (error) {
      toast.error("Error fetching batches: " + error.message);
    } else {
      setBatches(data || []);
    }
    setLoading(false);
  }

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('batches').insert([{
      ...newBatch,
      remainingquantity: newBatch.initialquantity
    }]);

    if (error) {
      toast.error("Failed to log delivery: " + error.message);
    } else {
      toast.success("New batch recorded successfully");
      setShowForm(false);
      fetchBatches();
    }
  };

  const updateQuantity = async (id: number, newQty: number) => {
    if (newQty < 0) return toast.error("Stock cannot be negative");
    const { error } = await supabase.from('batches').update({ remainingquantity: newQty }).eq('batchid', id);
    if (!error) fetchBatches();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] uppercase tracking-tighter">Batch Lifecycle</h2>
          <p className="text-gray-500 font-medium italic">Receiving and Expiry Tracking</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#263A29] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all"
        >
          {showForm ? "Cancel Entry" : "Log New Delivery"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleReceiveStock} className="mb-12 bg-[#F9FBF9] p-10 rounded-[40px] border border-[#E8F0E8] grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Product</label>
            <select required className="p-4 rounded-2xl border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-[#263A29]" onChange={(e) => setNewBatch({...newBatch, productid: e.target.value})}>
              <option value="">Select Product...</option>
              {products.map(p => <option key={p.productid} value={p.productid}>{p.productname}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Batch/Supplier Ref</label>
            <input required placeholder="e.g. SUP-1029-X" className="p-4 rounded-2xl border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-[#263A29]" onChange={(e) => setNewBatch({...newBatch, batchnumber: e.target.value})} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Expiry Date</label>
            <input required type="date" className="p-4 rounded-2xl border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-[#263A29]" onChange={(e) => setNewBatch({...newBatch, expirydate: e.target.value})} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Initial Qty</label>
            <input required type="number" placeholder="0" className="p-4 rounded-2xl border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-[#263A29]" onChange={(e) => setNewBatch({...newBatch, initialquantity: parseInt(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Cost Per Unit ($)</label>
            <input required type="number" step="0.01" placeholder="0.00" className="p-4 rounded-2xl border border-gray-100 font-bold text-sm outline-none focus:ring-2 focus:ring-[#263A29]" onChange={(e) => setNewBatch({...newBatch, costperunit: parseFloat(e.target.value)})} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#41644A] text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all">Commit to Ledger</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F9FBF9] text-[9px] font-black uppercase tracking-[0.2em] text-[#41644A] border-b border-gray-50">
            <tr>
              <th className="p-8">Batch Details</th>
              <th className="p-8 text-center">Cost/Unit</th>
              <th className="p-8 text-center">Expiry Status</th>
              <th className="p-8 text-center">Lifecycle</th>
              <th className="p-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {batches.map((batch) => {
              const today = new Date();
              const expiryDate = new Date(batch.expirydate);
              const isExpired = expiryDate < today;
              const depletionPercent = (batch.remainingquantity / batch.initialquantity) * 100;

              return (
                <tr key={batch.batchid} className="group hover:bg-gray-50/30 transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#263A29] rounded-xl flex items-center justify-center text-white font-black text-[10px]">{batch.batchid}</div>
                      <div>
                        <p className="font-black text-[#263A29] leading-tight">{batch.products?.productname}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {batch.batchnumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <span className="font-black text-[#263A29] text-base">${Number(batch.costperunit).toFixed(2)}</span>
                  </td>
                  
                  {/* ALIGNMENT FIX HERE */}
                  <td className="p-8 text-center min-w-[160px]">
                    <span className={`inline-block whitespace-nowrap px-4 py-2 rounded-2xl text-[11px] font-black uppercase border transition-colors ${
                      isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-[#41644A] border-green-100'
                    }`}>
                      {batch.expirydate}
                    </span>
                  </td>

                  <td className="p-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-full max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${depletionPercent < 20 ? 'bg-red-500' : 'bg-[#41644A]'}`} style={{ width: `${depletionPercent}%` }} />
                      </div>
                      <span className="font-black text-[#263A29] text-lg">{batch.remainingquantity} <span className="text-gray-300 font-medium text-xs">/ {batch.initialquantity}</span></span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => updateQuantity(batch.batchid, batch.remainingquantity - 1)} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center font-black text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">-</button>
                      <button onClick={() => updateQuantity(batch.batchid, batch.remainingquantity + 1)} className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center font-black text-gray-400 hover:bg-green-50 hover:text-green-500 transition-all">+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}