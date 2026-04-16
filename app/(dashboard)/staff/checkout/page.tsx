'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; // Added missing import
import { toast } from 'react-hot-toast';

export default function CheckoutPOS() {
  const router = useRouter(); // Initialize router
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedLocationId, setSelectedLocationId] = useState<number | string>(''); 
  const [locations, setLocations] = useState<any[]>([]);

  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  
  const [manualPromoCode, setManualPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const paymentMethods = [
    { id: 'cash', label: '💵 Cash' },
    { id: 'credit_card', label: '💳 Credit Card' },
    { id: 'debit_card', label: '🏧 Debit Card' },
    { id: 'mobile_payment', label: '📱 Mobile Payment' },
    { id: 'voucher', label: '🎫 Voucher' }
  ];

  // Helper to reset everything to "Blank"
  const clearEntireForm = () => {
    setCart([]);
    setCustomer(null);
    setCustomerPhone('');
    setAppliedPromo(null);
    setManualPromoCode('');
    setSearchQuery('');
    setSearchResults([]);
    setPhoneError('');
    setPromoError('');
  };

  useEffect(() => {
    async function getStores() {
        const { data } = await supabase.from('locations').select('locationid, name').eq('location_type', 'store');
        if (data) {
            setLocations(data);
            setSelectedLocationId(data[0]?.locationid || '');
        }
    }
    getStores();
  }, []);

  const handleCancelPromo = () => {
    setAppliedPromo(null);
    setManualPromoCode("");
    setPromoError("");
    toast.success("Promo removed");
  };

  const handleFindCustomer = async () => {
    setPhoneError("");
    const hkRegex = /^\+852-\d{4}-\d{4}$/;
    if (!customerPhone) return setPhoneError("Enter phone number");
    if (!hkRegex.test(customerPhone)) return setPhoneError("Required: +852-XXXX-XXXX");

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('userid, fullname, loyalty_points')
        .eq('phone', customerPhone.trim())
        .single();

      if (error || !userData) {
        setPhoneError("User not found in system");
        return;
      }

      setCustomer(userData);
      toast.success(`Member Found: ${userData.fullname}`);
    } catch (err: any) {
      setPhoneError("Database lookup failed");
    }
  };

  const handleApplyPromo = async () => {
    setPromoError("");
    if (!manualPromoCode) return;
    
    const { data, error } = await supabase
      .from('discounts')
      .select('value, type, discountid')
      .eq('code', manualPromoCode.toUpperCase().trim())
      .eq('status', 'active')
      .maybeSingle();

    if (error) return setPromoError("Server connection error");

    if (data) {
      setAppliedPromo(data);
      toast.success(`${data.value}${data.type === 'percentage' ? '%' : '$'} Applied!`);
    } else {
      setPromoError("Code does not exist or expired");
    }
  };

  const searchProducts = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) return setSearchResults([]);

    const { data } = await supabase
      .from('products')
      .select(`
        productid, name, barcode, currentprice,
        batches!inner (batchid, remainingqty, batchnumber)
      `)
      .or(`name.ilike.%${query}%,barcode.eq.${query}`)
      .gt('batches.remainingqty', 0) 
      .limit(5);

    setSearchResults(data || []);
  };

  const addToCart = async (product: any) => {
    const selectedBatch = product.batches[0];
    const existing = cart.find(item => item.productid === product.productid);
    
    if (existing) {
      updateQty(product.productid, 1);
    } else {
      setCart([...cart, { 
        productid: product.productid,
        name: product.name,
        currentprice: Number(product.currentprice), 
        batchid: selectedBatch.batchid,
        available: selectedBatch.remainingqty,
        qty: 1 
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQty = (productid: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productid === productid) {
        const newQty = item.qty + delta;
        if (newQty > item.available) {
          toast.error("Insufficient stock");
          return item;
        }
        return newQty <= 0 ? null : { ...item, qty: newQty };
      }
      return item;
    }).filter((item): item is any => item !== null));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.currentprice * item.qty), 0);
  const discountAmount = appliedPromo 
    ? (appliedPromo.type === 'percentage' ? (subtotal * (Number(appliedPromo.value) / 100)) : Number(appliedPromo.value)) 
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // --- REFINED PROCESS SALE WITH STOCK DEDUCTION & FULL RESET ---
  const processSale = async (methodId: string) => {
    if (cart.length === 0) return;
    const staffId = localStorage.getItem('userId');
    if (!staffId) return toast.error("Cashier ID not found. Re-login required.");

    setIsProcessing(true);

    try {
      // 1. Create the Master Transaction
      const { data: txn, error: txnError } = await supabase
        .from('sales_transactions')
        .insert([{
          transactionnumber: `TRX-${Date.now()}`,
          locationid: parseInt(selectedLocationId.toString()),
          customerid: customer?.userid || null,
          cashierid: parseInt(staffId),
          paymentmethod: methodId,
          totalprice: total
        }])
        .select('*')
        .single();

      if (txnError) throw new Error(`Transaction Error: ${txnError.message}`);

      // 2. Loop Cart: Items + Inventory Deduction
      for (const item of cart) {
        // A. Insert Sale Item
        const { error: itemErr } = await supabase.from('sales_items').insert([{
          saleid: txn.saleid,
          batchid: item.batchid,
          quantity: item.qty,
          unitprice: item.currentprice,
          finalprice: item.currentprice * item.qty,
          discountid: appliedPromo?.discountid || null
        }]);
        if (itemErr) console.error("Item Insert Error:", itemErr);

        // B. Subtract from Global Batches
        await supabase.from('batches')
          .update({ remainingqty: item.available - item.qty })
          .eq('batchid', item.batchid);

        // C. Subtract from Local Branch Inventory
        const { data: invData } = await supabase.from('inventory')
          .select('quantity')
          .eq('batchid', item.batchid)
          .eq('locationid', selectedLocationId)
          .single();
        
        if (invData) {
          await supabase.from('inventory')
            .update({ quantity: invData.quantity - item.qty })
            .eq('batchid', item.batchid)
            .eq('locationid', selectedLocationId);
        }
      }

      // 3. Update Loyalty
      if (customer?.userid) {
        await supabase.from('users')
          .update({ loyalty_points: (customer.loyalty_points || 0) + Math.floor(total) })
          .eq('userid', customer.userid);
      }

      // 4. TRANSACTION SUCCESSFUL - RESET EVERYTHING TO BLANK
      clearEntireForm();
      toast.success("Sale Recorded & Stock Deducted!");
      router.refresh();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Sale failed to process");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-12 gap-8">
        {/* LEFT COLUMN: PRODUCT SELECTION */}
        <div className="col-span-8 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <h2 className="text-3xl font-black text-[#263A29] uppercase mb-6">Checkout</h2>
          
          <div className="relative mb-8">
            <input 
              value={searchQuery} 
              onChange={(e) => searchProducts(e.target.value)} 
              placeholder="Barcode or Product Name..." 
              className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-[#41644A] rounded-2xl outline-none font-bold text-lg" 
            />
            {searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl mt-2 shadow-2xl z-50 overflow-hidden">
                {searchResults.length > 0 ? searchResults.map(p => (
                    <div key={p.productid} onClick={() => addToCart(p)} className="p-4 hover:bg-green-50 cursor-pointer flex justify-between border-b last:border-0">
                      <div>
                        <p className="font-bold text-[#263A29]">{p.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Stock: {p.batches[0].remainingqty}</p>
                      </div>
                      <p className="font-black text-[#41644A]">${p.currentprice}</p>
                    </div>
                  )) : (
                  <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs italic">⚠️ Not found</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            {cart.map(item => (
              <div key={item.productid} className="flex justify-between items-center p-4 bg-gray-50 rounded-[25px]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white rounded-xl shadow-sm border p-1">
                    <button onClick={() => updateQty(item.productid, -1)} className="w-8 h-8 text-red-500 font-black hover:bg-red-50 rounded-lg">−</button>
                    <span className="w-10 text-center font-black text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.productid, 1)} className="w-8 h-8 text-green-600 font-black hover:bg-green-50 rounded-lg">+</button>
                  </div>
                  <p className="font-bold text-[#263A29]">{item.name}</p>
                </div>
                <p className="font-black text-[#263A29] text-lg">${(item.currentprice * item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER & PAYMENT */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm space-y-6">
            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none text-[#263A29]">
              {locations.map(s => <option key={s.locationid} value={s.locationid}>{s.name}</option>)}
            </select>
            
            <div className="flex gap-2">
                <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+852-XXXX-XXXX" className="flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold min-w-0" />
                <button onClick={handleFindCustomer} className="bg-[#263A29] text-white px-5 py-3 rounded-xl text-xs font-black uppercase">Find</button>
            </div>
            
            {customer && (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                  <div><p className="font-black text-[#263A29] text-sm">{customer.fullname}</p><p className="text-[10px] text-green-700 font-bold uppercase">Pts: {customer.loyalty_points}</p></div>
                  <button onClick={() => { setCustomer(null); setCustomerPhone(''); }} className="text-gray-400 hover:text-red-500">✕</button>
                </div>
            )}

            <div className="flex gap-2">
                <input type="text" value={manualPromoCode} onChange={(e) => setManualPromoCode(e.target.value.toUpperCase())} disabled={!!appliedPromo} placeholder="PROMO" className="flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold uppercase min-w-0" />
                {appliedPromo ? <button onClick={handleCancelPromo} className="bg-red-50 text-red-600 px-5 py-3 rounded-xl text-xs font-black uppercase">Undo</button> : <button onClick={handleApplyPromo} className="bg-gray-100 text-[#263A29] px-5 py-3 rounded-xl text-xs font-black uppercase">Apply</button>}
            </div>
          </div>

          <div className="bg-[#263A29] p-8 rounded-[40px] text-white shadow-2xl">
            <div className="space-y-2 mb-6 opacity-80 text-[10px] font-black uppercase">
              <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {appliedPromo && <div className="flex justify-between text-green-400"><span>Discount</span><span>- ${discountAmount.toFixed(2)}</span></div>}
            </div>
            <div className="pt-4 border-t border-white/10 mb-8">
              <p className="text-[10px] font-black uppercase opacity-50 mb-1">Total to Pay</p>
              <p className="text-6xl font-black tracking-tighter">${total.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {paymentMethods.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => processSale(m.id)} 
                  disabled={isProcessing || cart.length === 0}
                  className="w-full py-4 bg-white/5 hover:bg-white hover:text-[#263A29] border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all text-left pl-6 disabled:opacity-20"
                >
                  {isProcessing ? 'Processing...' : m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}