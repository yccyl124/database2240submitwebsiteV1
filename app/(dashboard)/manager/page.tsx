'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Script from 'next/script';
import { TrendingUp, ShoppingBag, DollarSign, PieChart, LayoutDashboard, BarChart3 } from 'lucide-react';

export default function SalesAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0 });
  const [dbData, setDbData] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState('products'); 

  // 25 Distinct Professional Colors for Executive Reporting
  const EXECUTIVE_PALETTE = [
    '#263A29', '#F59E0B', '#2563EB', '#E11D48', '#7C3AED', 
    '#0891B2', '#EA580C', '#65A30D', '#4F46E5', '#BE185D', 
    '#0F766E', '#B45309', '#4338CA', '#9333EA', '#166534', 
    '#854D0E', '#1E40AF', '#991B1B', '#374151', '#15803D', 
    '#A21CAF', '#0369A1', '#D97706', '#57534E', '#1D4ED8'
  ];

  useEffect(() => {
    async function fetchSales() {
      const { data, error } = await supabase
        .from('sales_transactions')
        .select(`
          totalprice, 
          created_at, 
          paymentmethod,
          locations (name),
          sales_items (
            quantity,
            batches (
                products (
                    name, 
                    categories (name)
                )
            )
          )
        `);

      if (error) {
        console.error("Linkage Error:", error.message);
      } else if (data) {
        setDbData(data);
        const total = data.reduce((sum, s) => sum + Number(s.totalprice || 0), 0);
        setStats({ totalRevenue: total, totalOrders: data.length });
      }
      setLoading(false);
    }
    fetchSales();
  }, []);

  const drawCharts = () => {
    if (typeof window === 'undefined' || !(window as any).google || dbData.length === 0) return;

    const google = (window as any).google;
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
      
      // --- 1. REVENUE GROWTH TRAJECTORY ---
      const dailyMap: any = {};
      dbData.forEach(s => {
        const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyMap[date] = (dailyMap[date] || 0) + Number(s.totalprice);
      });
      const lineTable = google.visualization.arrayToDataTable([['Date', 'Revenue'], ...Object.entries(dailyMap)]);
      new google.visualization.AreaChart(document.getElementById('revenue_chart')).draw(lineTable, {
        title: 'Daily Gross Revenue Growth',
        hAxis: { textStyle: { fontSize: 10, color: '#999' }, gridlines: { color: 'transparent' } },
        vAxis: { textStyle: { fontSize: 10, color: '#999' }, gridlines: { color: '#f0f0f0' } },
        colors: ['#263A29'],
        areaOpacity: 0.1,
        legend: { position: 'none' },
        chartArea: { width: '90%', height: '70%' },
        curveType: 'function',
        backgroundColor: 'transparent'
      });

      // --- 2. CATEGORY DISTRIBUTION (Pie Chart with 25 Colors) ---
      const catMap: any = {};
      dbData.forEach(s => {
        s.sales_items?.forEach((item: any) => {
          const catName = item.batches?.products?.categories?.name || 'General';
          catMap[catName] = (catMap[catName] || 0) + Number(item.quantity);
        });
      });
      const pieTable = google.visualization.arrayToDataTable([['Category', 'Units Sold'], ...Object.entries(catMap)]);
      new google.visualization.PieChart(document.getElementById('category_chart')).draw(pieTable, {
        title: 'Sales Volume by Category',
        pieHole: 0.4,
        colors: EXECUTIVE_PALETTE,
        chartArea: { width: '90%', height: '80%' },
        legend: { position: 'right', textStyle: { fontSize: 12, bold: true } },
        backgroundColor: 'transparent'
      });

      // --- 3. CUSTOM INSIGHTS (Bar Chart with Multi-Color Bars) ---
      let rawData: any[] = [];
      if (activeReport === 'products') {
        const pMap: any = {};
        dbData.forEach(s => s.sales_items?.forEach((i: any) => {
          const n = i.batches?.products?.name;
          pMap[n] = (pMap[n] || 0) + i.quantity;
        }));
        rawData = Object.entries(pMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10);
      } else if (activeReport === 'branches') {
        const bMap: any = {};
        dbData.forEach(s => { const n = s.locations?.name || 'Main Store'; bMap[n] = (bMap[n] || 0) + Number(s.totalprice); });
        rawData = Object.entries(bMap);
      } else {
        const payMap: any = {};
        dbData.forEach(s => { const m = s.paymentmethod; payMap[m] = (payMap[m] || 0) + 1; });
        rawData = Object.entries(payMap);
      }

      // Add a 'style' role to the data table to allow individual bar colors
      const dataWithColors = rawData.map((item, index) => [
        item[0], 
        item[1], 
        EXECUTIVE_PALETTE[index % EXECUTIVE_PALETTE.length]
      ]);

      const optionalTable = new google.visualization.DataTable();
      optionalTable.addColumn('string', 'Label');
      optionalTable.addColumn('number', 'Value');
      optionalTable.addColumn({ type: 'string', role: 'style' });
      optionalTable.addRows(dataWithColors);

      new google.visualization.BarChart(document.getElementById('optional_chart')).draw(optionalTable, {
        title: `Performance drill-down: ${activeReport}`,
        chartArea: { width: '75%', height: '80%' },
        legend: { position: 'none' },
        hAxis: { textStyle: { fontSize: 10 } },
        vAxis: { textStyle: { fontSize: 11, bold: true } },
        backgroundColor: 'transparent'
      });
    });
  };

  useEffect(() => { if (!loading) drawCharts(); }, [loading, dbData, activeReport]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 min-h-screen bg-[#FBFBFB]">
      <Script src="https://www.gstatic.com/charts/loader.js" onLoad={drawCharts} />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#263A29] tracking-tighter uppercase">Executive Intelligence</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Visual Performance Reports for Management</p>
        </div>
        <div className="bg-white px-8 py-5 rounded-[25px] border border-gray-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-green-50 rounded-xl text-green-600"><DollarSign size={20}/></div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Gross Revenue</p>
              <p className="text-2xl font-black text-[#263A29]">${stats.totalRevenue.toLocaleString()}</p>
           </div>
        </div>
      </header>

      {/* ROW 1: GROWTH */}
      <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp size={24} className="text-[#41644A]" />
          <h3 className="text-sm font-black text-[#263A29] uppercase tracking-widest underline decoration-green-200 underline-offset-8">Growth Trajectory</h3>
        </div>
        <div id="revenue_chart" className="w-full h-[400px]">
           <p className="text-center py-40 text-gray-300 animate-pulse font-bold italic uppercase tracking-widest text-xs">Generating Time-Series Data...</p>
        </div>
      </div>

      {/* ROW 2: CATEGORY MARKET SHARE */}
      <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <PieChart size={24} className="text-[#41644A]" />
          <h3 className="text-sm font-black text-[#263A29] uppercase tracking-widest underline decoration-green-200 underline-offset-8">Category Market Share</h3>
        </div>
        <div id="category_chart" className="w-full h-[450px]">
           <p className="text-center py-40 text-gray-300 animate-pulse font-bold italic uppercase tracking-widest text-xs">Mapping Inventory Segments...</p>
        </div>
      </div>

      {/* ROW 3: DRILL-DOWN ANALYTICS */}
      <div className="bg-white p-10 rounded-[45px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
            <div className="flex items-center gap-3">
                <BarChart3 size={24} className="text-[#41644A]" />
                <h3 className="text-sm font-black text-[#263A29] uppercase tracking-widest underline decoration-green-200 underline-offset-8">Drill-Down Analytics</h3>
            </div>
            
            {/* TOGGLE BUTTONS */}
            <div className="flex bg-[#F3F4F1] p-2 rounded-2xl gap-2 shadow-inner">
                {['products', 'branches', 'payments'].map((type) => (
                    <button 
                        key={type}
                        onClick={() => setActiveReport(type)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                            activeReport === type 
                            ? 'bg-[#263A29] text-white shadow-lg scale-105' 
                            : 'text-gray-400 hover:text-[#263A29]'
                        }`}
                    >
                        {type === 'products' ? 'Top Items' : type === 'branches' ? 'By Store' : 'Payment Type'}
                    </button>
                ))}
            </div>
        </div>

        <div id="optional_chart" className="w-full h-[450px]">
           <p className="text-center py-40 text-gray-300 animate-pulse font-bold italic uppercase tracking-widest text-xs">Compiling Custom Report...</p>
        </div>
      </div>
    </div>
  );
}