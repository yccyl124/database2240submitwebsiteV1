'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Search, Receipt, User, Clock, Package } from 'lucide-react';

export default function StaffTasklistPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select(`
          saleid, 
          transactionnumber, 
          created_at, 
          paymentmethod, 
          totalprice,
          cashier:users!cashierid (fullname),
          customer:users!customerid (fullname),
          salesitems:sales_items (
            quantity, 
            unitprice, 
            finalprice,
            batches (
                products (name, barcode)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = data?.map(tx => {
        // FIX: Supabase joins return arrays. Normalize to objects to avoid build errors.
        const cashierData: any = Array.isArray(tx.cashier) ? tx.cashier[0] : tx.cashier;
        const customerData: any = Array.isArray(tx.customer) ? tx.customer[0] : tx.customer;

        const itemsList = tx.salesitems?.map((item: any) => {
          const productName = item.batches?.products?.name || 'Unknown Item';
          return `${item.quantity}x ${productName}`;
        }).join(', ');

        return { 
          ...tx, 
          itemsSummary: itemsList || 'No items recorded',
          cashierName: cashierData?.fullname || 'System',
          customerName: customerData?.fullname || 'Guest Customer'
        };
      });

      setTransactions(formatted || []);
    } catch (err: any) {
      toast.error("Failed to load transaction logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.transactionnumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase flex items-center gap-3">
            <Receipt size={32} className="text-[#41644A]" /> Transaction Logs
          </h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Staff interface for receipt verification</p>
        </div>
        <div className="relative">
          <input 
            type="text" placeholder="Search TRX# or Member..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-[#41644A]/5 shadow-sm w-80 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        </div>
      </header>

      <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-[#F9FBF9] text-[10px] font-black uppercase tracking-[0.2em] text-[#41644A] border-b border-gray-100">
            <tr>
              <th className="p-8">Time / ID</th>
              <th className="p-8">Customer</th>
              <th className="p-8">Items Sold</th>
              <th className="p-8 text-right">Settlement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredTransactions.map((tx) => (
              <tr key={tx.saleid} onClick={() => setSelectedTx(tx)} className="hover:bg-green-50/50 cursor-pointer transition-colors group">
                <td className="p-8">
                  <div className="flex items-center gap-3 text-gray-400 mb-1">
                    <Clock size={12} />
                    <span className="text-[10px] font-black uppercase">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-black text-[#41644A]">#{tx.transactionnumber}</p>
                </td>
                <td className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[#263A29]"><User size={14} /></div>
                        <p className="font-black text-[#263A29]">{tx.customerName}</p>
                    </div>
                </td>
                <td className="p-8 max-w-xs"><p className="text-gray-500 line-clamp-2 font-medium text-xs">{tx.itemsSummary}</p></td>
                <td className="p-8 text-right">
                  <p className="font-black text-[#263A29] text-xl tracking-tighter">${Number(tx.totalprice).toFixed(2)}</p>
                  <span className="text-[9px] font-black text-gray-300 uppercase">{tx.paymentmethod}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[45px] shadow-2xl overflow-hidden">
            <div className="p-10 bg-[#F9FBF9] border-b border-gray-100 flex justify-between items-center">
              <div><h3 className="text-2xl font-black text-[#263A29]">Receipt Details</h3></div>
              <button onClick={() => setSelectedTx(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-red-500 font-black border border-gray-100">✕</button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-5">
                {selectedTx.salesitems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start">
                    <div className="flex gap-3"><Package className="text-gray-200 mt-1" size={16} />
                        <div><p className="font-black text-sm text-[#263A29]">{item.batches?.products?.name}</p><p className="text-[10px] text-gray-400 uppercase font-bold">{item.quantity} Unit(s) @ ${item.unitprice}</p></div>
                    </div>
                    <p className="font-black text-[#263A29]">${Number(item.finalprice).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#263A29] p-8 rounded-[35px] text-white flex justify-between items-center">
                <div><p className="text-[10px] font-black uppercase opacity-50">Final Total</p><p className="text-4xl font-black">${Number(selectedTx.totalprice).toFixed(2)}</p></div>
                <Receipt className="opacity-20" size={40} />
              </div>
            </div>
            <div className="p-8 pt-0 bg-white"><button onClick={() => setSelectedTx(null)} className="w-full py-5 bg-gray-50 text-[#263A29] border border-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em]">Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
}