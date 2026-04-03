'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PurchaseHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
  try {
    setLoading(true);
    const storedUserId = localStorage.getItem('userId');
    console.log("Current User ID from LocalStorage:", storedUserId);

    if (!storedUserId) {
      console.error("No User ID found in LocalStorage. Are you logged in?");
      return;
    }

    const { data, error } = await supabase
      .from('sales_transactions')
      .select(`
        saleid, 
        transactionnumber, 
        created_at, 
        totalprice, 
        paymentmethod,
        salesitems:sales_items (
          quantity, 
          unitprice, 
          finalprice, 
          batches (
            products (
              name
            )
          )
        )
      `)
      .eq('customerid', parseInt(storedUserId)) // Ensure it's an integer
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
      console.error("Error Details:", error.details);
      console.error("Error Hint:", error.hint);
    } else {
      console.log("Data retrieved successfully:", data);
      setHistory(data || []);
    }
  } catch (err) {
    console.error("Unexpected Script Error:", err);
  } finally {
    setLoading(false);
  }
}
    fetchHistory();
  }, []);

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#263A29]">Purchase History</h1>
        <p className="text-[#41644A] font-medium">Click any transaction to view the full receipt.</p>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f3f4f1]/50 border-b border-gray-100">
              <tr className="text-[10px] font-black uppercase tracking-widest text-[#41644A]">
                <th className="px-8 py-5">Invoice</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((order) => (
                <tr 
                  key={order.saleid} 
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <td className="px-8 py-6 font-bold text-[#41644A] group-hover:underline">
                    #{order.transactionnumber}
                  </td>
                  <td className="px-8 py-6 text-[#263A29] font-medium">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-[#263A29]">
                    ${Number(order.totalprice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STEP 2: THE INVOICE SLIDE-OVER */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-10 animate-in slide-in-from-right overflow-y-auto">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="mb-8 text-[#41644A] font-bold hover:text-[#263A29] flex items-center gap-2"
            >
              ✕ Close Invoice
            </button>

            <div className="border-b border-dashed border-gray-200 pb-6 mb-6">
              <h2 className="text-2xl font-black text-[#263A29]">Receipt</h2>
              <p className="text-[#41644A] text-sm">Invoice #{selectedOrder.transactionnumber}</p>
              <p className="text-[#41644A] text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-4 mb-8">
              {selectedOrder.salesitems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#263A29]">{item.batches.products.productname}</p>
                    <p className="text-xs text-[#41644A]">Qty: {item.quantity} × ${Number(item.unitprice).toFixed(2)}</p>
                  </div>
                  <p className="font-bold text-[#263A29]">${Number(item.finalprice).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#f3f4f1] p-6 rounded-3xl">
              <div className="flex justify-between mb-2">
                <span className="text-[#41644A] font-medium text-sm">Payment Method</span>
                <span className="text-[#263A29] font-bold text-sm uppercase">{selectedOrder.paymentmethod}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white">
                <span className="text-[#263A29] font-black text-lg">Total</span>
                <span className="text-[#41644A] font-black text-2xl">${Number(selectedOrder.totalprice).toFixed(2)}</span>
              </div>
            </div>
            
            <p className="mt-10 text-center text-[10px] text-[#41644A] font-bold uppercase tracking-widest">
              Thank you for shopping at Groceria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}