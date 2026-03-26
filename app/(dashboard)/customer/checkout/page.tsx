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
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    storeId: '',
  });

  const [customerId, setCustomerId] = useState<number | null>(null);

  useEffect(() => {
    async function prepareCheckout() {
      // 1. Load Cart
      const savedCart = localStorage.getItem('active_cart');
      if (!savedCart || JSON.parse(savedCart).length === 0) {
        toast.error("Cart is empty");
        router.push('/customer/search');
        return;
      }
      const parsedCart = JSON.parse(savedCart);
      setCart(parsedCart);

      // 2. Fetch Stores for the dropdown
      const { data: storeData } = await supabase.from('stores').select('storeid, storename');
      setStores(storeData || []);

      // 3. AUTO-FILL: Match Auth User to Public Database
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: dbUser } = await supabase
          .from('users')
          .select(`
            fullname, email, phone, 
            customers (customerid, preferredstoreid)
          `)
          .eq('email', authUser.email)
          .single();

        if (dbUser) {
          // Access the first customer profile linked to this user
          const customerProfile = Array.isArray(dbUser.customers) ? dbUser.customers[0] : (dbUser.customers as any);
          
          setCustomerId(customerProfile?.customerid || null);
          setFormData({
            fullName: dbUser.fullname || '',
            email: dbUser.email || '',
            phone: dbUser.phone || '',
            storeId: customerProfile?.preferredstoreid?.toString() || '',
          });
        }
      }
      setLoading(false);
    }
    prepareCheckout();
  }, [router]);

  const handleSubmitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeId) return toast.error("Please select a store");
    
    setIsSubmitting(true);

    try {
      // A. GET A VALID SYSTEM USER (Required for cashierid)
      const { data: staffUser } = await supabase.from('users').select('userid').limit(1).single();

      // B. INSERT MASTER TRANSACTION (salestransactions)
      const { data: sale, error: saleError } = await supabase
        .from('salestransactions')
        .insert({
          transactionnumber: `RES-${Date.now()}`,
          storeid: parseInt(formData.storeId),
          customerid: customerId, 
          cashierid: staffUser?.userid || 1, 
          paymentmethod: 'cash', // Matches your lowercase enum exactly
          totalprice: cart.reduce((sum, i) => sum + (i.currentprice * i.qty), 0)
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // C. BATCH LOOKUP (Required for salesitems)
      const productIds = cart.map(i => i.productid);
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('batchid, productid')
        .in('productid', productIds);

      if (batchError || !batchData) throw new Error("Could not verify stock batches.");

      // D. INSERT LINE ITEMS (salesitems)
      const salesItemsRows = cart.map(item => {
        const matchingBatch = batchData.find(b => b.productid === item.productid);
        
        if (!matchingBatch) {
          throw new Error(`Item "${item.productname}" has no available stock batch in the database.`);
        }

        return {
          saleid: sale.saleid,
          batchid: matchingBatch.batchid,
          quantity: item.qty,
          unitprice: item.currentprice,
          finalprice: item.currentprice * item.qty
        };
      });

      const { error: itemsError } = await supabase.from('salesitems').insert(salesItemsRows);
      if (itemsError) throw itemsError;

      // E. SUCCESS & CLEANUP
      localStorage.removeItem('active_cart');
      toast.success("Linked! Reservation recorded in Supabase.");
      router.push('/customer/search');

    } catch (error: any) {
      console.error("Supabase Submission Error:", error);
      toast.error(error.message || "Checkout failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">SYNCHRONIZING WITH SUPABASE...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#263A29] tracking-tighter">CONFIRM PICKUP</h1>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Database-Linked Reservation System</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: FORM */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmitTrip} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Full Name</label>
                  <input 
                    type="text" required value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#41644A] outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Phone Number</label>
                  <input 
                    type="tel" required value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#41644A] outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#41644A] ml-2">Select Branch for Pickup</label>
                <select 
                  required value={formData.storeId}
                  onChange={(e) => setFormData({...formData, storeId: e.target.value})}
                  className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#41644A] outline-none font-bold appearance-none cursor-pointer"
                >
                  <option value="">Choose a store...</option>
                  {stores.map(s => <option key={s.storeid} value={s.storeid}>{s.storename}</option>)}
                </select>
              </div>
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className={`w-full py-6 rounded-[30px] font-black uppercase tracking-widest transition-all ${isSubmitting ? 'bg-gray-100 text-gray-400' : 'bg-[#263A29] text-white hover:bg-[#41644A] shadow-xl hover:-translate-y-1'}`}
            >
              {isSubmitting ? 'Processing...' : 'Finalize Reservation'}
            </button>
          </form>
        </div>

        {/* RIGHT: SUMMARY */}
        <div className="lg:col-span-1">
          <div className="bg-[#263A29] rounded-[40px] p-8 text-white sticky top-8">
            <h2 className="text-xs font-black uppercase opacity-50 tracking-widest mb-6">Order Summary</h2>
            <div className="space-y-4 mb-10 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <p className="font-bold text-sm leading-tight">{item.productname || item.name}</p>
                    <p className="text-[10px] opacity-60 mt-1">QTY: {item.qty}</p>
                  </div>
                  <p className="font-mono text-sm">${(item.currentprice * item.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/20 pt-6">
              <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total to pay at store</p>
              <p className="text-5xl font-black mt-1">${cart.reduce((sum, i) => sum + (i.currentprice * i.qty), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}