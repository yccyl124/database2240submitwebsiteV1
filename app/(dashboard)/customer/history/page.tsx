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
        // 1. Get the logged-in User ID (e.g., 31)
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) return;

        // 2. Find the CustomerID linked to that User
        const { data: customer } = await supabase
          .from('customers')
          .select('customerid')
          .eq('userid', storedUserId)
          .single();

        if (customer) {
          // 3. Use the DYNAMIC customerid instead of hardcoded '1'
          const { data, error } = await supabase
            .from('salestransactions')
            .select(`
              saleid, transactionnumber, created_at, totalprice, paymentmethod,
              salesitems (quantity, unitprice, finalprice, batches (products (productname)))
            `)
            .eq('customerid', customer.customerid) // FIXED HERE
            .order('created_at', { ascending: false });

          if (!error && data) {
            setHistory(data);
          }
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  // ... (Rest of your return JSX remains the same)

  return (
        <div className="p-8 w-full max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand-deep">Purchase History</h1>
        <p className="text-brand-accent font-medium">Click any transaction to view the full receipt.</p>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-brand-bg rounded-2xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-brand-accent/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-brand-bg/50 border-b border-brand-accent/5">
              <tr className="text-[10px] font-black uppercase tracking-widest text-brand-accent">
                <th className="px-8 py-5">Invoice</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-bg">
              {history.map((order) => (
                <tr 
                  key={order.saleid} 
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-brand-bg/30 cursor-pointer transition-colors group"
                >
                  <td className="px-8 py-6 font-bold text-brand-primary group-hover:underline">
                    #{order.transactionnumber}
                  </td>
                  <td className="px-8 py-6 text-brand-deep font-medium">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-brand-deep">
                    ${order.totalprice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STEP 2: THE INVOICE SLIDE-OVER */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-brand-deep/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-10 animate-slide-in overflow-y-auto">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="mb-8 text-brand-accent font-bold hover:text-brand-deep flex items-center gap-2"
            >
              ✕ Close Invoice
            </button>

            <div className="border-b border-dashed border-brand-accent/20 pb-6 mb-6">
              <h2 className="text-2xl font-black text-brand-deep">Receipt</h2>
              <p className="text-brand-accent text-sm">Invoice #{selectedOrder.transactionnumber}</p>
              <p className="text-brand-accent text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>

            <div className="space-y-4 mb-8">
              {selectedOrder.salesitems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-brand-deep">{item.batches.products.productname}</p>
                    <p className="text-xs text-brand-accent">Qty: {item.quantity} × ${item.unitprice.toFixed(2)}</p>
                  </div>
                  <p className="font-bold text-brand-deep">${item.finalprice.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="bg-brand-bg p-6 rounded-3xl">
              <div className="flex justify-between mb-2">
                <span className="text-brand-accent font-medium text-sm">Payment Method</span>
                <span className="text-brand-deep font-bold text-sm uppercase">{selectedOrder.paymentmethod}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white">
                <span className="text-brand-deep font-black text-lg">Total</span>
                <span className="text-brand-primary font-black text-2xl">${selectedOrder.totalprice.toFixed(2)}</span>
              </div>
            </div>
            
            <p className="mt-10 text-center text-[10px] text-brand-accent font-bold uppercase tracking-widest">
              Thank you for shopping at Groceria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}