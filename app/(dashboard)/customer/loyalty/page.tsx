'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoyaltyPage() {
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // State for the "Manual Redemption" Modal
  const [activeVoucher, setActiveVoucher] = useState<any | null>(null);

  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);
  const NEXT_TIER_GOAL = 500; 
  const progressPercent = Math.min((calculatedPoints / NEXT_TIER_GOAL) * 100, 100);

  async function fetchLoyaltyData() {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      let { data: customer } = await supabase
        .from('customers')
        .select(`customerid, users (fullname)`)
        .eq('userid', userId)
        .single();

      if (customer) {
        setCustomerData(customer);
        const { data: history } = await supabase
          .from('salestransactions')
          .select(`transactionnumber, totalprice, created_at, stores(storename)`)
          .eq('customerid', customer.customerid)
          .order('created_at', { ascending: false });

        const total = history?.reduce((sum, tx) => sum + Math.floor(Number(tx.totalprice)), 0) || 0;
        setCalculatedPoints(total);
        setTransactions(history || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLoyaltyData(); }, []);

  if (loading) return <p className="p-10 text-center animate-pulse font-black text-[#41644A]">Loading Points...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 relative">
      
      {/* POINTS CARD */}
      <div className="bg-[#41644A] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] opacity-70 mb-2">Loyalty Member</p>
          <h1 className="text-3xl font-black mb-8">{customerData?.users?.fullname || 'Member'}</h1>
          <div className="flex items-end gap-2">
            <span className="text-7xl font-black tracking-tighter">{calculatedPoints}</span>
            <span className="text-xl font-bold mb-3 opacity-80">Points</span>
          </div>
          <div className="mt-8 space-y-2">
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-700" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {calculatedPoints} / {NEXT_TIER_GOAL} Points to Gold Tier
            </p>
          </div>
        </div>
      </div>

      {/* REWARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "$50 Cash Voucher", pts: 500, color: "#41644A", code: "SAVE50" },
          { title: "Priority Pickup", pts: 100, color: "#263A29", code: "FASTPASS" }
        ].map((reward) => (
          <div key={reward.title} className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm">
            <h4 className="font-black text-xl text-[#263A29]">{reward.title}</h4>
            <p className="text-xs text-gray-500 font-bold mt-2 italic">Requires {reward.pts} points</p>
            <button 
              onClick={() => setActiveVoucher(reward)}
              disabled={calculatedPoints < reward.pts}
              className={`mt-6 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                calculatedPoints >= reward.pts 
                ? 'bg-[#41644A] text-white hover:scale-[1.02]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {calculatedPoints >= reward.pts ? 'Redeem at Counter' : 'Insufficient Points'}
            </button>
          </div>
        ))}
      </div>

      {/* MANUAL REDEMPTION MODAL */}
      {activeVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#f3f4f1] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🎁
            </div>
            <h3 className="text-2xl font-black text-[#263A29] mb-2">{activeVoucher.title}</h3>
            <p className="text-gray-500 text-sm font-medium mb-8">
              Please show this screen to the cashier during checkout to claim your reward.
            </p>
            
            <div className="bg-[#f3f4f1] border-2 border-dashed border-gray-300 p-6 rounded-2xl mb-8">
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Voucher Code</p>
              <p className="text-3xl font-black tracking-tighter text-[#41644A]">{activeVoucher.code}-{customerData.customerid}</p>
            </div>

            <button 
              onClick={() => setActiveVoucher(null)}
              className="w-full py-4 bg-[#263A29] text-white rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-xl font-black text-[#263A29] uppercase tracking-tighter">Activity History</h2>
          {transactions.length > 5 && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs font-bold text-[#41644A] underline">
              {showAll ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
          {displayedTransactions.map((tx, idx) => (
            <div key={idx} className="flex justify-between items-center p-6 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-bold text-[#263A29]">{tx.stores?.storename || 'Market'}</p>
                <p className="text-[10px] text-gray-400 font-medium">#{tx.transactionnumber}</p>
              </div>
              <p className="font-black text-[#41644A]">+{Math.floor(Number(tx.totalprice))} pts</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}