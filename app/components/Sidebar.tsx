'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // FORCE detection based on URL path first to prevent wrong sidebar
    const getActiveRole = () => {
      if (pathname.startsWith('/restocker')) return 'restocker';
      if (pathname.startsWith('/manager')) return 'manager';
      if (pathname.startsWith('/staff')) return 'staff';
      if (pathname.startsWith('/customer')) return 'customer';
      
      // Fallback to localStorage only if not in a specific dashboard path
      return localStorage.getItem('role')?.toLowerCase() || null;
    };

    setRole(getActiveRole());
  }, [pathname]);

  const menuConfig: Record<string, any[]> = {
    'staff': [
      // ADDED: The proposal explicitly requires "Checkout Operations" for Cashiers to scan barcodes, deduct stock, and process Octopus/AlipayHK/PayMe[cite: 41].
      { name: 'Checkout POS', icon: '🛒', path: '/staff/checkout' }, 
      { name: 'Task List', icon: '✅', path: '/staff' },
      { name: 'Inventory Check', icon: '📦', path: '/staff/inventory' }, // This handles the "Customer Support" stock/aisle queries[cite: 42].
      { name: 'Expiry Alerts', icon: '⌛', path: '/staff/expiry' }, 
    ],
    'manager': [
      { name: 'Home', icon: '🏠', path: '/manager' },
      { name: 'Sales Analytics', icon: '📈', path: '/manager' }, // Renamed from Overview to match daily/weekly/monthly sales trends.
      { name: 'Promotions', icon: '✨', path: '/manager/promotions' }, // ADDED: Flash sales and markdown management for expiring/overstock goods.
      { name: 'Stock Adjustments', icon: '✍️', path: '/manager/adjustments' }, // Required: record stock changes with mandatory reason codes (theft, damage).
      { name: 'Audit Logs', icon: '🕵️‍♂️', path: '/manager/audit' }, // Reviews cashier activity metrics and staff accuracy.
      { name: 'Staff Control', icon: '👥', path: '/manager/staff' } // Performance tracking and cashier volume monitoring.
    ],
    'restocker': [
      { name: 'Logistics Command', icon: '🏗️', path: '/restocker' }, // Handles stock movements and inter-store shipments[cite: 53].
      { name: 'Batch Management', icon: '🔢', path: '/restocker/batches' }, // Records incoming deliveries with expiry dates and unit costs[cite: 52].
      // ADDED: Warehouse staff must approve/reject store discount proposals and execute price changes[cite: 54, 55].
      { name: 'Pricing & Approvals', icon: '💲', path: '/restocker/pricing' }, 
      // ADDED: The proposal requires an ultimate "Audit & History" view for the back-end to track all database changes[cite: 56].
      { name: 'Master Audit', icon: '🗄️', path: '/restocker/audit' }, 
    ],
    'customer': [
      { name: 'Home', icon: '🏠', path: '/customer' },
      { name: 'Shop Products', icon: '🛒', path: '/customer/search' },
      { name: 'Shopping List', icon: '📝', path: '/customer/list' },
      { name: 'Active Rewards', icon: '🎁', path: '/customer/promotions' },
      { name: 'Nearest Store', icon: '📍', path: '/customer/nearest-store' },
      { name: 'My Wishlist', icon: '✨', path: '/customer/wishlist' },
      { name: 'Order History', icon: '📜', path: '/customer/history' },
      { name: 'Loyalty Rewards', icon: '💎', path: '/customer/loyalty' },
    ],
  };

  const menuItems = role ? menuConfig[role] || [] : [];

  const handleLogout = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <>
      <aside className="w-72 bg-white border-r border-brand-accent/10 p-8 flex flex-col shadow-sm fixed h-screen left-0 top-0 z-40">
        <div className="flex items-center gap-3 mb-12 px-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#41644A] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-xl font-bold">g.</span>
            </div>
            <h2 className="text-[#263A29] font-bold text-2xl tracking-tighter">groceria.</h2>
          </Link>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              <Link key={item.name} href={item.path}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                  pathname === item.path 
                    ? 'bg-[#41644A] text-white shadow-md shadow-[#41644A]/20' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-[#41644A] font-medium'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-sm tracking-tight">{item.name}</span>
              </Link>
            ))
          ) : (
             <p className="text-xs text-gray-400 px-4">Detecting role: {role || 'none'}...</p>
          )}
        </nav>

        <div className="pt-6 mt-6 border-t border-brand-accent/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black uppercase tracking-widest text-[10px]">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>
      <div className="w-72 flex-shrink-0 hidden lg:block"></div>
    </>
  );
}