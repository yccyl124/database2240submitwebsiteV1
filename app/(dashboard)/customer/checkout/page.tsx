'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // DISCOUNT STATES
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    locationId: '',
  });

  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    async function prepareCheckout() {
      const savedCart = localStorage.getItem('active_cart');
      if (!savedCart || JSON.parse(savedCart).length === 0) {
        toast.error("Cart is empty");
        router.push('/customer/search');
        return;
      }
      setCart(JSON.parse(savedCart));

      const { data: storeData } = await supabase
        .from('locations')
        .select('locationid, name')
        .eq('location_type', 'store');
      setStores(storeData || []);

      const storedId = localStorage.getItem('userId');
      if (storedId) {
        setUserId(parseInt(storedId));
        const { data: dbUser } = await supabase
          .from('users')
          .select('fullname, email, phone, assigned_location_id')
          .eq('userid', parseInt(storedId))
          .single();

        if (dbUser) {
          setFormData({
            fullName: dbUser.fullname || '',
            email: dbUser.email || '',
            phone: dbUser.phone || '',
            locationId: dbUser.assigned_location_id?.toString() || '',
          });
        }
      }
      setLoading(false);
    }
    prepareCheckout();
  }, [router]);

  const applyDiscountCode = async () => {
    if (!discountInput) return;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', discountInput.trim())
      .eq('status', 'active')
      .lte('startdate', today)
      .gte('enddate', today)
      .single();

    if (error || !data) {
      toast.error("Invalid or expired code");
      setAppliedDiscount(null);
    } else {
      setAppliedDiscount(data);
      toast.success(`Code applied!`);
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + (i.currentprice * i.qty), 0);
  let discountAmount = 0;
  if (appliedDiscount) {
    discountAmount = appliedDiscount.type === 'percentage' 
      ? (subtotal * Number(appliedDiscount.value)) / 100 
      : Number(appliedDiscount.value);
  }
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleSubmitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationId) return toast.error("Please select a store");
    setIsSubmitting(true);

    try {
      const { data: staffUser } = await supabase.from('users').select('userid').limit(1).single();
      const { data: sale, error: saleError } = await supabase
        .from('sales_transactions')
        .insert({
          transactionnumber: `RES-${Date.now()}`,
          locationid: parseInt(formData.locationId),
          customerid: userId, 
          cashierid: staffUser?.userid || 1, 
          paymentmethod: 'cash', 
          totalprice: finalTotal
        })
        .select().single();

      if (saleError) throw saleError;

      const productIds = cart.map(i => i.productid);
      const { data: batchData } = await supabase.from('batches').select('batchid, productid').in('productid', productIds);

      const salesItemsRows = cart.map(item => {
        const matchingBatch = batchData?.find(b => b.productid === item.productid);
        return {
          saleid: sale.saleid,
          batchid: matchingBatch?.batchid,
          discountid: appliedDiscount?.discountid || null,
          quantity: item.qty,
          unitprice: item.currentprice,
          finalprice: item.currentprice * item.qty
        };
      });

      await supabase.from('sales_items').insert(salesItemsRows);
      localStorage.removeItem('active_cart');
      toast.success("Confirmed!");
      router.push('/customer/search');
    } catch (error: any) {
      toast.error(error.message || "Checkout failed");
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest text-gray-300">Synchronizing...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <h1 className="text-4xl font-black text-[#263A29] mb-10 tracking-tighter">CONFIRM PICKUP</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmitTrip} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                <input type="tel" placeholder="Phone" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
              </div>
              <select required value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold appearance-none cursor-pointer">
                <option value="">Select Branch...</option>
                {stores.map(s => <option key={s.locationid} value={s.locationid}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[#263A29] text-white rounded-[30px] font-black uppercase tracking-widest hover:bg-[#41644A] transition-all">
              {isSubmitting ? 'Processing...' : 'Finalize Reservation'}
            </button>
          </form>
        </div>

        {/* SIDEBAR SUMMARY */}
        <div className="lg:col-span-1">
          <div className="bg-[#263A29] rounded-[40px] p-8 text-white sticky top-8 space-y-8">
            <div>
              <h2 className="text-xs font-black uppercase opacity-50 tracking-widest mb-6">Order Summary</h2>
              <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b border-white/10 pb-4">
                    <p className="font-bold text-xs flex-1">{item.name || item.productname}</p>
                    <p className="font-mono text-xs ml-4">${(item.currentprice * item.qty).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FIXED DISCOUNT INPUT SECTION */}
            <div className="bg-white/5 p-6 rounded-[30px] border border-white/10 w-full overflow-hidden">
              <label className="text-[9px] font-black uppercase opacity-50 tracking-[0.2em] mb-3 block">Promo Code</label>
              <div className="flex items-center gap-2 w-full">
                <input 
                  type="text" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} 
                  placeholder="Code" 
                  className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold w-[65%] focus:bg-white/20 outline-none"
                />
                <button 
                  type="button"
                  onClick={applyDiscountCode} 
                  className="bg-white text-[#263A29] px-1 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-yellow-400 transition-all w-[35%]"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* TOTALS */}
            <div className="border-t border-white/20 pt-6 space-y-3">
              <div className="flex justify-between text-[10px] font-bold opacity-60 uppercase">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-4">
                <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">Pay at store</p>
                <p className="text-5xl font-black text-yellow-400 tracking-tighter">${finalTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}