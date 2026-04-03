'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Script from 'next/script';
import { Package, Search, PieChart, ShieldAlert, Calendar, Box, Database } from 'lucide-react';

export default function RestockerDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 25 Distinct Professional Colors for the Pie Chart
  const LOGISTICS_PALETTE = [
    '#263A29', '#F59E0B', '#2563EB', '#E11D48', '#7C3AED', 
    '#0891B2', '#EA580C', '#65A30D', '#4F46E5', '#BE185D', 
    '#0F766E', '#B45309', '#4338CA', '#9333EA', '#166534', 
    '#854D0E', '#1E40AF', '#991B1B', '#374151', '#15803D', 
    '#A21CAF', '#0369A1', '#D97706', '#57534E', '#1D4ED8'
  ];

  useEffect(() => {
    const loadWarehouseData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('batches')
        .select(`
          *, 
          products (
            name, 
            categories (name)
          )
        `)
        .order('expirydate', { ascending: true });
      
      setItems(data || []);
      setLoading(false);
    };
    loadWarehouseData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchnumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.products?.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, items]);

  const drawCharts = () => {
    if (typeof window === 'undefined' || !(window as any).google || items.length === 0) return;

    const google = (window as any).google;
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      
      // 1. Category Volume (Pie Chart) - UPDATED WITH 25 COLORS
      const catMap: any = {};
      items.forEach(item => {
        const catName = item.products?.categories?.name || 'General';
        catMap[catName] = (catMap[catName] || 0) + Number(item.remainingqty);
      });
      const pieTable = google.visualization.arrayToDataTable([['Category', 'Units'], ...Object.entries(catMap)]);
      new google.visualization.PieChart(document.getElementById('cat_volume_chart')).draw(pieTable, {
        title: 'Inventory Volume by Segment',
        pieHole: 0.4,
        colors: LOGISTICS_PALETTE,
        chartArea: { width: '90%', height: '80%' },
        legend: { position: 'right', textStyle: { fontSize: 11, bold: true } },
        backgroundColor: 'transparent'
      });

      // 2. Expiry Risk (Column Chart)
      const expiryMap: any = {};
      items.slice(0, 8).forEach(item => {
        const date = item.expirydate || 'No Date';
        expiryMap[date] = (expiryMap[date] || 0) + Number(item.remainingqty);
      });
      const expiryTable = google.visualization.arrayToDataTable([['Date', 'Units'], ...Object.entries(expiryMap)]);
      new google.visualization.ColumnChart(document.getElementById('expiry_timeline_chart')).draw(expiryTable, {
        title: 'Immediate Expiry Risks (Unit Count)',
        colors: ['#EF4444'],
        chartArea: { width: '85%', height: '70%' },
        legend: { position: 'none' },
        hAxis: { textStyle: { fontSize: 10, bold: true } },
        vAxis: { textStyle: { fontSize: 10 } },
        backgroundColor: 'transparent'
      });
    });
  };

  useEffect(() => { if (!loading) drawCharts(); }, [loading, items]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 min-h-screen bg-[#FBFBFB]">
      <Script src="https://www.gstatic.com/charts/loader.js" onLoad={drawCharts} />

      {/* EXECUTIVE HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase flex items-center gap-3">
             <Database className="text-[#41644A]" size={36} /> Warehouse Intelligence
          </h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Logistics Analytics & Expiry Risk Assessment</p>
        </div>
        <div className="bg-white px-8 py-5 rounded-[25px] border border-gray-100 shadow-sm flex items-center gap-4">
           <Box className="text-[#41644A]" />
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">System Batches</p>
              <p className="text-2xl font-black text-[#263A29]">{items.length}</p>
           </div>
        </div>
      </header>

      {/* ROW 1: ENHANCED PIE CHART */}
      <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <PieChart size={24} className="text-[#41644A]" />
          <h3 className="text-sm font-black text-[#263A29] uppercase tracking-widest underline decoration-green-200 underline-offset-8">Stock Distribution</h3>
        </div>
        <div id="cat_volume_chart" className="w-full h-[450px]">
           <p className="text-center py-40 text-gray-300 animate-pulse font-bold italic uppercase tracking-widest text-xs">Mapping Warehouse Segments...</p>
        </div>
      </div>

      {/* ROW 2: EXPIRY TIMELINE */}
      <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert size={24} className="text-red-500" />
          <h3 className="text-sm font-black text-[#263A29] uppercase tracking-widest underline decoration-red-200 underline-offset-8 text-red-600">Expiry Risk Analysis</h3>
        </div>
        <div id="expiry_timeline_chart" className="w-full h-[400px]">
           <p className="text-center py-40 text-gray-300 animate-pulse font-bold italic uppercase tracking-widest text-xs">Analyzing Batch Lifecycles...</p>
        </div>
      </div>

      {/* ROW 3: SEARCHABLE WAREHOUSE STOCK */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Warehouse Inventory Search</h3>
            <div className="w-full md:w-96 relative group">
                <input 
                    type="text"
                    placeholder="Search by Product, Batch, or Category..."
                    className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-[#41644A]/5 transition-all font-bold text-[#263A29]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-4 text-gray-300 group-focus-within:text-[#41644A] transition-colors" size={20} />
            </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-[#41644A] border-b border-gray-100">
                <tr>
                <th className="p-8">Product / Category</th>
                <th className="p-8">Batch ID</th>
                <th className="p-8">Remaining</th>
                <th className="p-8 text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-8">
                        <p className="font-black text-[#263A29] group-hover:text-[#41644A] transition-colors">{item.products?.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{item.products?.categories?.name}</p>
                    </td>
                    <td className="p-8 font-mono text-xs text-gray-400 uppercase">#{item.batchnumber}</td>
                    <td className="p-8 font-black text-[#263A29] text-lg">
                        {item.remainingqty}
                    </td>
                    <td className="p-8 text-right">
                        <div className="flex flex-col items-end">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm border ${
                                new Date(item.expirydate) < new Date() 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : item.remainingqty < 10 
                                ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                : 'bg-green-50 text-[#41644A] border-green-100'
                            }`}>
                                {new Date(item.expirydate) < new Date() ? 'Expired' : 'In Stock'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-300 mt-2 flex items-center gap-1 uppercase">
                                <Calendar size={10} /> Exp: {item.expirydate || 'None'}
                            </span>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
            {filteredItems.length === 0 && (
                <div className="p-32 text-center text-gray-300 font-bold italic uppercase tracking-widest text-xs">
                    No matching records found in warehouse.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}