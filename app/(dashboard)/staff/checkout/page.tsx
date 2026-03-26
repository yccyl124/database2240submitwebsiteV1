'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function CheckoutPOS() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- STORE STATE ---
  const [selectedStoreId, setSelectedStoreId] = useState<number>(2); // Default to Store 2
  const [stores] = useState<any[]>([
    { id: 1, name: 'HK Central' },
    { id: 2, name: 'Kowloon Bay' },
    { id: 3, name: 'Causeway Bay' }
  ]);

  // 1. CUSTOMER & PROMO STATE
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [manualPromoCode, setManualPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  // 2. HK PAYMENT METHODS
  const paymentMethods = [
    { id: 'cash', label: '💵 Cash' },
    { id: 'credit_card', label: '💳 Credit Card' },
    { id: 'octopus', label: '🐙 Octopus' },
    { id: 'alipayhk', label: '📱 AlipayHK' },
    { id: 'payme', label: '🔴 PayMe' }
  ];

  const handleCancelPromo = () => {
    setAppliedPromo(null);
    setManualPromoCode("");
    toast.success("Store promo removed");
  };

  // --- FIXED CUSTOMER LOOKUP ---
  const handleFindCustomer = async () => {
    if (!customerPhone) return toast.error("Enter phone number");
    
    // Clear previous state while searching
    setCustomer(null);

    try {
      // Step 1: Find User by Phone (Using your schema: userid, fullname, phone)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('userid, fullname')
        .eq('phone', customerPhone.trim())
        .maybeSingle();

      if (userError) throw userError;
      
      if (!userData) {
        return toast.error("No user found with this phone number");
      }

      // Step 2: Find the Customer record linked to that User
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('customerid')
        .eq('userid', userData.userid)
        .maybeSingle();

      if (custError) throw custError;

      if (customerData) {
        // Step 3: Successfully update state
        setCustomer({
          fullname: userData.fullname,
          customerid: customerData.customerid
        });
        toast.success(`Member Found: ${userData.fullname}`);
      } else {
        toast.error(`${userData.fullname} is not a registered Member`);
      }
    } catch (err: any) {
      console.error("Lookup Error:", err.message);
      toast.error("Database lookup failed");
    }
  };

  // --- APPLY PROMO CODE ---
  const handleApplyPromo = async () => {
    if (!manualPromoCode) return;
    
    const { data, error } = await supabase
      .from('discounts')
      .select('discountvalue, discounttype')
      .eq('discountcode', manualPromoCode.toUpperCase().trim())
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error("Promo Error:", error);
      return toast.error("Promo lookup failed");
    }

    if (data) {
      setAppliedPromo(data);
      toast.success(`${data.discountvalue}% Applied!`);
    } else {
      toast.error("Invalid Code");
    }
  };

  // --- PRODUCT SEARCH ---
  const searchProducts = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) return setSearchResults([]);

    const { data, error } = await supabase
      .from('products')
      .select(`
        productid, productname, barcode, currentprice,
        batches!inner (batchid, remainingquantity)
      `)
      .or(`productname.ilike.%${query}%,barcode.eq.${query}`)
      .gt('batches.remainingquantity', 0) 
      .limit(5);

    if (error) console.error("Search Error:", error.message);
    setSearchResults(data || []);
  };

  // --- ADD TO CART ---
  const addToCart = async (product: any) => {
    const selectedBatch = product.batches[0];
    const finalPrice = Number(product.currentprice);

    const existing = cart.find(item => item.productid === product.productid);
    
    if (existing) {
      updateQty(product.productid, 1);
    } else {
      setCart([...cart, { 
        productid: product.productid,
        productname: product.productname,
        currentprice: finalPrice, 
        batchid: selectedBatch.batchid,
        available: selectedBatch.remainingquantity,
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

  // --- CALCULATIONS ---
  const subtotal = cart.reduce((sum, item) => sum + (item.currentprice * item.qty), 0);
  const discountAmount = appliedPromo ? (subtotal * (Number(appliedPromo.discountvalue) / 100)) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // --- PROCESS SALE ---
  const processSale = async (methodId: string) => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Insert Transaction Header
      const { data: txnData, error: txnError } = await supabase
        .from('salestransactions')
        .insert([{
          transactionnumber: `TRX-${Date.now()}`,
          storeid: selectedStoreId, 
          customerid: customer?.customerid || null, 
          staffid: 1,      
          cashierid: 1,    
          paymentmethod: methodId,
          totalprice: total, 
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (txnError) throw new Error(txnError.message);
      const newSaleId = txnData.saleid;

      // 2. Process Items and Stock
      for (const item of cart) {
        // Record sale item
        await supabase.from('salesitems').insert([{
          saleid: newSaleId,
          batchid: item.batchid,
          quantity: item.qty,
          unitprice: item.currentprice,
          finalprice: item.currentprice * item.qty
        }]);

        // Update batch stock
        await supabase
          .from('batches')
          .update({ remainingquantity: item.available - item.qty })
          .eq('batchid', item.batchid);
      }

      // 3. NEW: UPDATE LOYALTY POINTS
      // If a member was identified, add points (1 point per $1 spent, floored)
      if (customer?.customerid) {
        const pointsToAdd = Math.floor(total);
        
        // We use an RPC or a manual increment here
        const { error: loyaltyError } = await supabase.rpc('increment_loyalty_points', {
          row_id: customer.customerid,
          num_to_add: pointsToAdd
        });

        // Fallback if you haven't created the RPC function yet:
        if (loyaltyError) {
          const { data: currentCust } = await supabase
            .from('customers')
            .select('loyaltypoints')
            .eq('customerid', customer.customerid)
            .single();

          await supabase
            .from('customers')
            .update({ loyaltypoints: (currentCust?.loyaltypoints || 0) + pointsToAdd })
            .eq('customerid', customer.customerid);
        }
      }

      toast.success("Sale Completed & Points Added!");
      setCart([]);
      setCustomer(null);
      setCustomerPhone('');
      setAppliedPromo(null);
      
    } catch (err: any) {
      console.error("Sale Error:", err);
      toast.error(`Sale Failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-12 gap-8">
        {/* LEFT COLUMN: PRODUCT SECTION */}
        <div className="col-span-8 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <h2 className="text-3xl font-black text-[#263A29] uppercase mb-6">Checkout</h2>
          
          <div className="relative mb-8">
            <input 
              value={searchQuery}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="Scan Barcode or Search..." 
              className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-[#41644A] rounded-2xl outline-none font-bold text-lg"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl mt-2 shadow-2xl z-50">
                {searchResults.map(p => (
                  <div key={p.productid} onClick={() => addToCart(p)} className="p-4 hover:bg-green-50 cursor-pointer flex justify-between border-b last:border-0">
                    <div>
                      <p className="font-bold">{p.productname}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase">STOCK: {p.batches[0].remainingquantity}</p>
                    </div>
                    <p className="font-black text-[#41644A]">${p.currentprice}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {cart.map(item => (
              <div key={item.productid} className="flex justify-between items-center p-4 bg-gray-50 rounded-[25px]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center bg-white rounded-xl shadow-sm border p-1">
                    <button onClick={() => updateQty(item.productid, -1)} className="w-8 h-8 text-red-500 font-black hover:bg-red-50 rounded-lg">−</button>
                    <span className="w-10 text-center font-black text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.productid, 1)} className="w-8 h-8 text-green-600 font-black hover:bg-green-50 rounded-lg">+</button>
                  </div>
                  <div>
                    <p className="font-bold text-[#263A29]">{item.productname}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">${item.currentprice.toFixed(2)} each</p>
                  </div>
                </div>
                <p className="font-black text-[#263A29] text-lg">${(item.currentprice * item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3">Active Store</h3>
            <select 
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none text-[#263A29]"
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm space-y-6">
            <div className="w-full">
              <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3">Customer Member</h3>
              <div className="flex gap-2">
                <input 
                  type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+852-XXXX-XXXX" className="flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold min-w-0"
                />
                <button onClick={handleFindCustomer} className="bg-[#263A29] text-white px-5 py-3 rounded-xl text-xs font-black uppercase">Find</button>
              </div>
              {customer && (
                <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-[#263A29] text-sm">{customer.fullname}</p>
                    <p className="text-[10px] text-green-700 font-bold uppercase tracking-tight">ID: {customer.customerid}</p>
                  </div>
                  <button onClick={() => { setCustomer(null); setCustomerPhone(''); }} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                </div>
              )}
            </div>

            <hr className="border-gray-50" />

            <div className="w-full">
              <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3">Store Promo</h3>
              <div className="flex gap-2">
                <input 
                  type="text" value={manualPromoCode} onChange={(e) => setManualPromoCode(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo} placeholder="CODE20"
                  className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-bold uppercase min-w-0 ${appliedPromo ? 'text-gray-400' : ''}`}
                />
                {appliedPromo ? (
                  <button onClick={handleCancelPromo} className="bg-red-50 text-red-600 px-5 py-3 rounded-xl text-xs font-black uppercase border border-red-100">Undo</button>
                ) : (
                  <button onClick={handleApplyPromo} className="bg-gray-100 text-[#263A29] px-5 py-3 rounded-xl text-xs font-black uppercase">Apply</button>
                )}
              </div>
            </div>
          </div>

          {/* TOTAL & PAYMENT SECTION */}
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
                <button key={m.id} onClick={() => processSale(m.id)} disabled={isProcessing || cart.length === 0}
                  className="w-full py-4 bg-white/5 hover:bg-white hover:text-[#263A29] border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all text-left pl-6 disabled:opacity-20"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}