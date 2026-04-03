'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function StaffControl() {
  const [staffData, setStaffData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  useEffect(() => {
    fetchStaffPerformance();
  }, []);

  async function fetchStaffPerformance() {
    setLoading(true);
    // Updated: table name 'sales_transactions' and joining 'users' for names
    const { data, error } = await supabase
      .from('sales_transactions')
      .select(`
        cashierid, 
        totalprice, 
        transactionnumber, 
        created_at,
        cashier:users!cashierid (fullname)
      `);

    if (error) {
      console.error("Staff metrics error:", error.message);
      toast.error("Failed to load metrics");
    } else if (data) {
      const stats = data.reduce((acc: any, curr: any) => {
        const id = curr.cashierid;
        const name = curr.cashier?.fullname || `Staff #${id}`;
        
        if (!acc[id]) {
          acc[id] = { id, name, totalSales: 0, count: 0, transactions: [] };
        }
        acc[id].totalSales += Number(curr.totalprice || 0);
        acc[id].count += 1;
        acc[id].transactions.push(curr);
        return acc;
      }, {});

      const sortedStats = Object.values(stats).sort((a: any, b: any) => b.totalSales - a.totalSales);
      setStaffData(sortedStats);
    }
    setLoading(false);
  }

  const closeModal = () => {
    setSelectedStaff(null);
    setIsExpanded(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Staff Intelligence</h2>
          <p className="text-gray-500 font-medium italic">Monitor performance metrics and transaction volume per cashier.</p>
        </div>
        <button onClick={fetchStaffPerformance} className="bg-[#263A29] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#41644A] transition-all active:scale-95">
          Refresh Data
        </button>
      </header>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F9FBF9] text-[10px] font-black uppercase tracking-widest text-[#41644A]">
            <tr>
              <th className="p-8">Cashier Name</th>
              <th className="p-8 text-center">Sales Count</th>
              <th className="p-8">Total Revenue</th>
              <th className="p-8 text-right">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffData.map((staff, index) => (
              <tr key={staff.id} onClick={() => setSelectedStaff(staff)} className="hover:bg-green-50/50 cursor-pointer transition-colors group">
                <td className="p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#263A29] text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase">
                      {staff.name.substring(0, 2)}
                    </div>
                    <div>
                      {/* Now showing the actual name instead of just ID */}
                      <p className="font-black text-[#263A29]">{staff.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {staff.id} • Tap to view</p>
                    </div>
                  </div>
                </td>
                <td className="p-8 text-center">
                  <p className="text-xl font-black text-[#263A29]">{staff.count}</p>
                </td>
                <td className="p-8">
                  <span className="font-black text-[#41644A] text-2xl tracking-tighter">
                    ${staff.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="p-8 text-right">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {index === 0 ? '🏆 Top Performer' : 'Active'}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PERFORMANCE MODAL */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-[650px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden transition-all duration-500">
            
            {/* MODAL HEADER */}
            <div className="px-10 py-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                {isExpanded && (
                    <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors font-black">←</button>
                )}
                <div>
                    <h3 className="text-2xl font-black text-[#263A29] leading-tight">
                        {isExpanded ? "All Transactions" : "Staff Analytics"}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{selectedStaff.name}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-red-500 transition-all font-black">✕</button>
            </div>
            
            {/* CONTENT */}
            <div className="px-10 py-6 flex-grow overflow-hidden flex flex-col">
              {!isExpanded ? (
                <div className="flex flex-col h-full">
                  <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
                    <div className="p-8 bg-[#F9FBF9] rounded-[35px] border border-[#E8F0E8] shadow-sm">
                      <p className="text-[10px] font-black text-[#41644A] uppercase tracking-widest mb-2">Avg. Basket Size</p>
                      <p className="text-3xl font-black text-[#263A29]">${(selectedStaff.totalSales / selectedStaff.count).toFixed(2)}</p>
                    </div>
                    <div className="p-8 bg-blue-50/50 rounded-[35px] border border-blue-100/50 shadow-sm">
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Orders Processed</p>
                      <p className="text-3xl font-black text-[#263A29]">{selectedStaff.count}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Recent Transactions</h4>
                    <button onClick={() => setIsExpanded(true)} className="text-[9px] font-black text-[#41644A] uppercase bg-green-50 px-4 py-2 rounded-xl border border-green-100 hover:bg-green-100 transition-colors">
                      Show All Logs
                    </button>
                  </div>

                  <div className="space-y-3 overflow-hidden">
                    {selectedStaff.transactions.slice(0, 3).map((t: any, i: number) => (
                        <div key={i} className="flex justify-between items-center px-6 py-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                           <div>
                            <span className="text-[11px] font-black text-[#263A29] tracking-tight block">{t.transactionnumber}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                          <span className="font-black text-[#41644A] text-lg">${Number(t.totalprice).toFixed(2)}</span>
                        </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
                   {selectedStaff.transactions.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between items-center px-6 py-5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-green-200 transition-colors">
                      <div>
                        <span className="text-sm font-black text-[#263A29] tracking-tight block">{t.transactionnumber}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      <span className="font-black text-[#41644A] text-xl">${Number(t.totalprice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-10 py-8 bg-white border-t border-gray-50 shrink-0">
              <button onClick={closeModal} className="w-full py-5 bg-[#263A29] text-white rounded-[25px] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-[#41644A] active:scale-95 transition-all">
                Exit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}