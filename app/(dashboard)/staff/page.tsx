'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function TransactionLogging() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MODAL STATE ---
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salestransactions')
        .select(`
          saleid, transactionnumber, created_at, cashierid, customerid, paymentmethod, totalprice,
          salesitems (
            quantity, unitprice, finalprice,
            batches (products (productname, barcode))
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formatted = data?.map(tx => {
        const itemsList = tx.salesitems?.map((item: any) => {
          const productName = item.batches?.products?.productname || 'Unknown Item';
          return `${item.quantity}x ${productName}`;
        }).join(', ');

        return { ...tx, itemsSummary: itemsList || 'No items recorded' };
      });

      setTransactions(formatted || []);
    } catch (err: any) {
      toast.error("Failed to load logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.transactionnumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.cashierid.toString().includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-[#263A29]">Transaction Logs</h2>
          <p className="text-gray-500 font-medium">Click any row to view full receipt details.</p>
        </div>
        <input 
          type="text" 
          placeholder="Search TRX or ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-5 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-[#41644A] shadow-sm w-64"
        />
      </header>

      <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-[#41644A] text-white text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="p-6">Timestamp</th>
              <th className="p-6">Transaction ID</th>
              <th className="p-6">Items Sold</th>
              <th className="p-6 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredTransactions.map((tx) => (
              <tr 
                key={tx.saleid} 
                onClick={() => setSelectedTx(tx)}
                className="hover:bg-green-50/50 cursor-pointer transition-colors group"
              >
                <td className="p-6 text-xs font-bold text-gray-400">
                  {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-6 font-mono text-xs font-black text-[#41644A] group-hover:underline">
                  {tx.transactionnumber}
                </td>
                {/* FIXED: whitespace-normal allows the text to wrap into multiple lines */}
                <td className="p-6 max-w-xs whitespace-normal">
                  <p className="text-gray-600 leading-relaxed font-medium">
                    {tx.itemsSummary}
                  </p>
                </td>
                <td className="p-6 text-right font-black text-[#263A29]">
                  ${Number(tx.totalprice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- TRANSACTION DETAIL MODAL --- */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#263A29]">Receipt Detail</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedTx.transactionnumber}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-gray-300 hover:text-red-500 font-black text-2xl">✕</button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                {selectedTx.salesitems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-[#263A29]">{item.batches.products.productname}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.quantity} x ${item.unitprice}</p>
                    </div>
                    <p className="font-black text-[#263A29]">${Number(item.finalprice).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-dashed border-gray-200 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                  <span>Payment Method</span>
                  <span>{selectedTx.paymentmethod}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                  <span>Cashier ID</span>
                  <span>{selectedTx.cashierid}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-end">
                <p className="text-[10px] font-black uppercase text-[#41644A]">Total Paid</p>
                <p className="text-4xl font-black text-[#263A29] tracking-tighter">${Number(selectedTx.totalprice).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-6 bg-white">
              <button 
                onClick={() => setSelectedTx(null)}
                className="w-full py-4 bg-[#263A29] text-white rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}