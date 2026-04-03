'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Script from 'next/script';
import Link from 'next/link';
import { 
  ShoppingBag, 
  TrendingUp, 
  CheckCircle2, 
  PackageSearch,
  Timer,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function StaffHomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, criticalExpiries: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [dbData, setDbData] = useState<any[]>([]);
  
  // FIXED: State to hold current user ID safely
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);

  const STAFF_COLORS = ['#263A29', '#F59E0B', '#2563EB', '#E11D48', '#7C3AED', '#0891B2'];

  useEffect(() => {
    async function loadStaffData() {
      try {
        setLoading(true);
        
        // Safely access localStorage inside useEffect (Client-side only)
        const staffId = localStorage.getItem('userId');
        setCurrentStaffId(staffId); // Save for visual display

        if (!staffId) return;

        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 1. Fetch Today's Transactions for this Staff
        const { data: sales, error: salesError } = await supabase
          .from('sales_transactions')
          .select(`
            totalprice, created_at, paymentmethod, transactionnumber,
            sales_items (
              quantity, 
              batches (products (name))
            )
          `)
          .eq('cashierid', parseInt(staffId))
          .gte('created_at', today);

        if (salesError) throw salesError;

        // 2. Fetch Expiry Alerts
        const { count: expiryCount } = await supabase
          .from('batches')
          .select('*', { count: 'exact', head: true })
          .lte('expirydate', nextWeekStr)
          .gte('expirydate', today)
          .gt('remainingqty', 0);

        if (sales) {
          setDbData(sales);
          const total = sales.reduce((sum, s) => sum + Number(s.totalprice || 0), 0);
          setStats({ 
            todayRevenue: total, 
            todayOrders: sales.length, 
            criticalExpiries: expiryCount || 0 
          });
          setRecentSales(sales.slice(-5).reverse());
        }
      } catch (err) {
        console.error("Staff Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStaffData();
  }, []);

  const drawCharts = () => {
    if (typeof window === 'undefined' || !(window as any).google || dbData.length === 0) return;
    const google = (window as any).google;
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      
      const payMap: any = {};
      dbData.forEach(s => {
        const method = s.paymentmethod?.replace('_', ' ') || 'Other';
        payMap[method] = (payMap[method] || 0) + Number(s.totalprice);
      });
      const payTable = google.visualization.arrayToDataTable([['Method', 'Revenue'], ...Object.entries(payMap)]);
      new google.visualization.PieChart(document.getElementById('staff_pie_chart')).draw(payTable, {
        title: 'Settlement Summary (By Value)',
        pieHole: 0.4,
        colors: STAFF_COLORS,
        chartArea: { width: '90%', height: '80%' },
        legend: { position: 'bottom', textStyle: { fontSize: 10, bold: true } },
        backgroundColor: 'transparent'
      });

      const itemMap: any = {};
      dbData.forEach(s => s.sales_items?.forEach((si: any) => {
        const n = si.batches?.products?.name || 'Unknown';
        itemMap[n] = (itemMap[n] || 0) + si.quantity;
      }));
      const sortedItems = Object.entries(itemMap).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5);
      const itemTable = google.visualization.arrayToDataTable([
        ['Product', 'Units', { role: 'style' }], 
        ...sortedItems.map((d, i) => [d[0], d[1], STAFF_COLORS[i % STAFF_COLORS.length]])
      ]);
      new google.visualization.BarChart(document.getElementById('staff_bar_chart')).draw(itemTable, {
        title: 'Top Items Processed Today',
        legend: { position: 'none' },
        chartArea: { width: '60%', height: '70%' },
        hAxis: { minValue: 0 },
        backgroundColor: 'transparent'
      });
    });
  };

  useEffect(() => { if (!loading) drawCharts(); }, [loading, dbData]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#FBFBFB]">
      <Script src="https://www.gstatic.com/charts/loader.js" onLoad={drawCharts} />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Operations Hub</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" /> Terminal Active • Shift ID: {currentStaffId || '...'}
          </p>
        </div>
        
        <div className="flex gap-3">
            <Link href="/staff/checkout" className="bg-[#263A29] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg">
                <ShoppingBag size={16} /> Open POS
            </Link>
            <Link href="/staff/inventory" className="bg-white text-[#263A29] border border-gray-100 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
                <PackageSearch size={16} /> Stock Check
            </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Shift Revenue</p>
            <h4 className="text-4xl font-black text-[#263A29] tracking-tighter">${stats.todayRevenue.toFixed(2)}</h4>
            <div className="mt-4 flex items-center gap-2 text-green-600 text-[10px] font-black uppercase"><TrendingUp size={12}/> Live Log</div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Transactions</p>
            <h4 className="text-4xl font-black text-[#263A29] tracking-tighter">{stats.todayOrders}</h4>
            <div className="mt-4 flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase"><Timer size={12}/> Active Session</div>
        </div>
        <Link href="/staff/expiry" className="bg-red-50 p-8 rounded-[40px] border border-red-100 group hover:bg-red-100 transition-all">
            <p className="text-[10px] font-black text-red-400 uppercase mb-2">Shelf Alerts</p>
            <h4 className="text-4xl font-black text-red-600 tracking-tighter">{stats.criticalExpiries} Items</h4>
            <div className="mt-4 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase font-bold">Action Required <ChevronRight size={12}/></div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
            <h3 className="text-xs font-black text-[#263A29] uppercase tracking-widest mb-6">Settlement Breakdown</h3>
            <div id="staff_pie_chart" className="w-full h-[350px]">
                <p className="text-center py-40 text-gray-300 animate-pulse font-bold uppercase text-[10px]">Processing Till Data...</p>
            </div>
        </div>
        <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
            <h3 className="text-xs font-black text-[#263A29] uppercase tracking-widest mb-6">Product Throughput</h3>
            <div id="staff_bar_chart" className="w-full h-[350px]">
                <p className="text-center py-40 text-gray-300 animate-pulse font-bold uppercase text-[10px]">Analyzing Volume...</p>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-4">Your Recent Sales</h3>
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#F9FBF9] text-[9px] font-black uppercase tracking-widest text-[#41644A] border-b border-gray-100">
                    <tr>
                        <th className="p-8">Time</th>
                        <th className="p-8">TRX Number</th>
                        <th className="p-8">Primary Item</th>
                        <th className="p-8 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {recentSales.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="p-8 text-xs font-bold text-gray-400">
                                {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-8 font-mono text-xs font-black text-[#263A29]">#{s.transactionnumber}</td>
                            <td className="p-8 text-[10px] text-gray-500 font-bold uppercase">
                                {s.sales_items?.[0]?.batches?.products?.name || 'Bulk Item'}
                                {s.sales_items?.length > 1 && <span className="text-[#41644A] ml-1">+{s.sales_items.length - 1} More</span>}
                            </td>
                            <td className="p-8 text-right font-black text-[#263A29] text-xl tracking-tighter">${Number(s.totalprice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}