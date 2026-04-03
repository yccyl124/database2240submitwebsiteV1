'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Search, X, Tag, Package } from 'lucide-react';

export default function PromotionsPage() {
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form State - Initialize with empty string or number
  const [discount, setDiscount] = useState<number | string>(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchActivePromos();
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDb = async () => {
      if (searchTerm.length < 2) { setSuggestions([]); return; }
      const { data } = await supabase
        .from('products')
        .select(`productid, name, currentprice`)
        .ilike('name', `%${searchTerm}%`)
        .limit(5);
      setSuggestions(data || []);
    };
    const timer = setTimeout(searchDb, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchActivePromos() {
    const { data } = await supabase
      .from('discounts')
      .select('*, products(name)')
      .order('enddate', { ascending: true });
    setActivePromos(data || []);
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !endDate) return toast.error("Please select a product and end date");
    
    const discountVal = typeof discount === 'string' ? parseInt(discount) : discount;
    if (isNaN(discountVal) || discountVal <= 0) return toast.error("Enter a valid discount");

    setIsSubmitting(true);

    try {
      const uniqueCode = `SALE-${selectedProduct.productid}-${Date.now().toString().slice(-4)}`;
      
      const { error } = await supabase.from('discounts').insert([{
        productid: selectedProduct.productid,
        code: uniqueCode,
        type: 'percentage',
        value: discountVal,
        startdate: startDate,
        enddate: endDate,
        status: 'active',
        description: `Flash Markdown for ${selectedProduct.name}`
      }]);

      if (error) throw error;

      toast.success("Promotion active!");
      setSelectedProduct(null);
      setSearchTerm('');
      setEndDate('');
      fetchActivePromos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Campaign Manager</h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Drive sales with targeted inventory discounts</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className="bg-[#263A29] p-8 rounded-[40px] text-white shadow-2xl sticky top-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-8">Launch Campaign</h3>
            
            <form onSubmit={handleCreatePromo} className="space-y-6">
              {/* PRODUCT SEARCH */}
              <div className="relative" ref={searchRef}>
                <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">Search Product</label>
                {!selectedProduct ? (
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm outline-none focus:bg-white/20 transition-all text-white"
                      placeholder="Type product name..."
                      value={searchTerm || ''}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-4 top-4 opacity-30" size={18} />
                    
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100">
                        {suggestions.map(p => (
                          <div 
                            key={p.productid}
                            onClick={() => { setSelectedProduct(p); setShowSuggestions(false); }}
                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 flex justify-between items-center"
                          >
                            <span className="font-bold text-[#263A29] text-xs">{p.name}</span>
                            <span className="text-[10px] font-black text-gray-400">${Number(p.currentprice).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-5 flex justify-between items-center animate-in fade-in zoom-in">
                    <div>
                      <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Target Selected</p>
                      <p className="font-black text-sm">{selectedProduct.name}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* FIXED: DISCOUNT PERCENTAGE (Prevents NaN Error) */}
              <div>
                <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">Markdown Amount (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm outline-none text-white"
                    value={discount} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiscount(val === '' ? '' : parseInt(val));
                    }}
                  />
                  <Tag className="absolute right-4 top-4 opacity-30" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">Start</label>
                  <input type="date" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-[10px] outline-none text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">End</label>
                  <input type="date" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-[10px] outline-none text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-white text-[#263A29] rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-green-50 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Processing...' : 'Activate Discount'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Table */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase tracking-widest text-[#41644A]">
                  <th className="px-10 py-6">Product Item</th>
                  <th className="px-5 py-6 text-center">Markdown</th>
                  <th className="px-10 py-6 text-right">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activePromos.map((promo) => (
                  <tr key={promo.discountid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-10 py-8 text-[#263A29]">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#f3f4f1] rounded-2xl text-[#263A29]"><Package size={20} /></div>
                        <div>
                          <p className="font-black">{promo.products?.name}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Ref: {promo.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center font-black text-red-500 text-xl">
                      -{promo.value}%
                    </td>
                    <td className="px-10 py-8 text-right">
                      <p className="text-sm font-black text-[#263A29]">
                        {new Date(promo.enddate).toLocaleDateString()}
                      </p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expiration</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}