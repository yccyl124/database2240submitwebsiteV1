'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function RestockerDashboard() {
  const [activeTab, setActiveTab] = useState<'warehouse' | 'orders'>('warehouse');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'warehouse') {
        // Requirement: View Current Warehouse Inventory [cite: 55, 79]
        const { data } = await supabase.from('batches').select('*, products(productname)');
        setItems(data || []);
      } else {
        // Requirement: Supplier Order Tracking [cite: 56, 80]
        const { data } = await supabase.from('supplierorders').select('*, products(productname), suppliers(suppliername)');
        setItems(data || []);
      }
    };
    loadData();
  }, [activeTab]);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-black text-[#263A29] mb-6">Logistics Command</h2>
      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('warehouse')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'warehouse' ? 'bg-[#41644A] text-white' : 'bg-gray-100'}`}>Warehouse Batches</button>
        <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'orders' ? 'bg-[#41644A] text-white' : 'bg-gray-100'}`}>Supplier Orders</button>
      </div>

      <div className="bg-white rounded-[30px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <tr>
              <th className="p-6">Target</th>
              <th className="p-6">{activeTab === 'warehouse' ? 'Batch ID' : 'Supplier'}</th>
              <th className="p-6">Quantity</th>
              <th className="p-6">Status/Expiry</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-6 font-bold">{item.products?.productname}</td>
                <td className="p-6">{activeTab === 'warehouse' ? item.batchnumber : item.suppliers?.suppliername}</td>
                <td className="p-6 font-black text-[#41644A]">{item.remainingquantity || item.quantity}</td>
                <td className="p-6 text-sm">{activeTab === 'warehouse' ? item.expirydate : item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}