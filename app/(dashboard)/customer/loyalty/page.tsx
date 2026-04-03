'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoyaltyPage() {
  const [userData, setUserData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  const [activeVoucher, setActiveVoucher] = useState<any | null>(null);

  const NEXT_TIER_GOAL = 500; 
  const isGold = currentPoints >= NEXT_TIER_GOAL;
  const progressPercent = Math.min((currentPoints / NEXT_TIER_GOAL) * 100, 100);
  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);

  async function fetchLoyaltyData() {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      let { data: user } = await supabase
        .from('users')
        .select(`userid, fullname, loyalty_points`)
        .eq('userid', userId)
        .single();

      if (user) {
        setUserData(user);
        setCurrentPoints(user.loyalty_points || 0);

        const { data: history } = await supabase
          .from('sales_transactions')
          .select(`transactionnumber, totalprice, created_at, locations (name)`)
          .eq('customerid', userId)
          .order('created_at', { ascending: false });

        if (history) setTransactions(history);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLoyaltyData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="animate-pulse font-black text-[#41644A] uppercase tracking-widest">Updating Points...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 relative">
      
      {/* POINTS CARD */}
      <div className={`rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden transition-colors duration-500 ${isGold ? 'bg-[#263A29]' : 'bg-[#41644A]'}`}>
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] opacity-70 mb-2">
            {isGold ? 'Gold Tier Member' : 'Standard Member'}
          </p>
          <h1 className="text-3xl font-black mb-8">{userData?.fullname || 'Member'}</h1>
          
          <div className="flex items-end gap-2">
            <span className="text-7xl font-black tracking-tighter">{currentPoints}</span>
            <span className="text-xl font-bold mb-3 opacity-80">Points</span>
          </div>

          <div className="mt-8 space-y-2">
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-700" style={{ width: `${progressPercent}%` }} />
            </div>
            {/* Logic fix for text display */}
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {isGold 
                ? '✨ Gold Status Unlocked • Enjoy Exclusive Benefits' 
                : `${currentPoints} / ${NEXT_TIER_GOAL} Points to Gold Tier`
              }
            </p>
          </div>
        </div>
      </div>

      {/* REWARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "$50 Cash Voucher", pts: 500, code: "SAVE50" },
          { title: "Priority Pickup", pts: 100, code: "FASTPASS" }
        ].map((reward) => (
          <div key={reward.title} className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm">
            <h4 className="font-black text-xl text-[#263A29]">{reward.title}</h4>
            <p className="text-xs text-gray-500 font-bold mt-2 italic">Requires {reward.pts} points</p>
            <button 
              onClick={() => setActiveVoucher(reward)}
              disabled={currentPoints < reward.pts}
              className={`mt-6 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                currentPoints >= reward.pts 
                ? 'bg-[#41644A] text-white hover:scale-[1.02] shadow-lg shadow-[#41644A]/20' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentPoints >= reward.pts ? 'Redeem at Counter' : 'Insufficient Points'}
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
              Show this screen to the cashier during checkout.
            </p>
            
            <div className="bg-[#f3f4f1] border-2 border-dashed border-gray-300 p-6 rounded-2xl mb-8">
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Voucher Code</p>
              <p className="text-3xl font-black tracking-tighter text-[#41644A]">{activeVoucher.code}-{userData?.userid}</p>
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

      {/* ACTIVITY HISTORY */}
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
          {displayedTransactions.length > 0 ? (
            displayedTransactions.map((tx, idx) => (
              <div key={idx} className="flex justify-between items-center p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-bold text-[#263A29]">{tx.locations?.name || 'Groceria Branch'}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">#{tx.transactionnumber}</p>
                </div>
                <p className="font-black text-[#41644A]">+{Math.floor(Number(tx.totalprice || 0))} pts</p>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-400 font-bold italic">No activity recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}