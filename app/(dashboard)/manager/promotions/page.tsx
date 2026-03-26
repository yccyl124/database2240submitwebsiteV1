'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function PromotionsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discount, setDiscount] = useState(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: prodData } = await supabase.from('products').select('productid, productname, currentprice');
    const { data: promoData } = await supabase
      .from('promotions')
      .select('*, products(productname)')
      .order('enddate', { ascending: true });

    setProducts(prodData || []);
    setActivePromos(promoData || []);
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !endDate) return toast.error("Please fill all fields");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('promotions').insert([{
        productid: parseInt(selectedProductId),
        discountpercentage: discount,
        startdate: startDate,
        enddate: endDate,
        isactive: true
      }]);

      if (error) throw error;

      toast.success("Promotion launched successfully!");
      setSelectedProductId('');
      setEndDate('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Campaign Manager</h1>
        <p className="text-gray-500 font-medium">Create markdowns and seasonal discounts to drive inventory turnover.</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Create Promo Form */}
        <div className="col-span-12 lg:col-span-4">
          <form onSubmit={handleCreatePromo} className="bg-[#263A29] p-8 rounded-[40px] text-white shadow-xl sticky top-8">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">New Promotion</h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase block mb-2">Select Product</label>
                <select 
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm outline-none focus:bg-white/20"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="" className="text-black">Choose product...</option>
                  {products.map(p => (
                    <option key={p.productid} value={p.productid} className="text-black">
                      {p.productname} (${p.currentprice})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase block mb-2">Discount (%)</label>
                <input 
                  type="number" 
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm outline-none"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-2">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-2">End Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-white text-[#263A29] rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4 hover:bg-green-50 transition-all active:scale-95"
              >
                {isSubmitting ? 'Syncing...' : 'Activate Discount'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Active Promotions Table */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F9FBF9] text-[10px] font-black uppercase tracking-widest text-[#41644A]">
                <tr>
                  <th className="p-6">Product</th>
                  <th className="p-6">Markdown</th>
                  <th className="p-6">Validity Period</th>
                  <th className="p-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {activePromos.map((promo) => (
                  <tr key={promo.promotionid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6">
                      <p className="font-bold text-[#263A29]">{promo.products?.productname}</p>
                    </td>
                    <td className="p-6 font-black text-red-500">
                      -{promo.discountpercentage}%
                    </td>
                    <td className="p-6 text-gray-400 font-medium">
                      {promo.startdate} to {promo.enddate}
                    </td>
                    <td className="p-6 text-right">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">
                        Live
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activePromos.length === 0 && (
              <div className="p-20 text-center text-gray-400 italic">No active promotions scheduled.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}