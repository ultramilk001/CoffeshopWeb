import React, { useState, useMemo } from 'react';
import { getStoredTransactions, getStoredProducts } from '../data';
import { Transaction, ProductCategory } from '../types';
import { TrendingUp, Users, DollarSign, ShoppingBag, Coffee, Award, Calendar, ChevronDown, ListFilter, AlertCircle, BarChart2 } from 'lucide-react';

export default function DashboardScreen() {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Load transactions and products
  const transactions: Transaction[] = useMemo(() => {
    return getStoredTransactions();
  }, []);

  const products = useMemo(() => {
    return getStoredProducts();
  }, []);

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Safe checks for dates
  const isToday = (dateStr: string) => {
    const txDate = new Date(dateStr);
    const today = new Date();
    return txDate.getDate() === today.getDate() &&
      txDate.getMonth() === today.getMonth() &&
      txDate.getFullYear() === today.getFullYear();
  };

  const isWithinDays = (dateStr: string, days: number) => {
    const txDate = new Date(dateStr).getTime();
    const boundaryDate = Date.now() - days * 24 * 60 * 60 * 1000;
    return txDate >= boundaryDate;
  };

  // Filtered transactions based on dropdown
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (timeRange === 'today') return isToday(tx.createdAt);
      if (timeRange === '7days') return isWithinDays(tx.createdAt, 7);
      if (timeRange === '30days') return isWithinDays(tx.createdAt, 30);
      return true;
    });
  }, [transactions, timeRange]);

  // Calculations for Today KPI Core
  const todayStats = useMemo(() => {
    const todayTxs = transactions.filter(tx => isToday(tx.createdAt));
    const sales = todayTxs.reduce((sum, tx) => sum + tx.total, 0);
    const transactionCount = todayTxs.length;
    return {
      revenue: sales,
      count: transactionCount,
    };
  }, [transactions]);

  // Accumulate general stats for selected range
  const rangeStats = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
    const totalTransactions = filteredTransactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalDiscountGiven = filteredTransactions.reduce((sum, tx) => sum + tx.discount, 0);
    
    // Product Sales Counter
    const productSoldCounter: { [key: string]: { name: string; category: ProductCategory; qty: number; revenue: number } } = {};
    
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        if (!productSoldCounter[item.productId]) {
          const originalProd = products.find(p => p.id === item.productId);
          productSoldCounter[item.productId] = {
            name: item.name,
            category: originalProd?.category || 'coffee',
            qty: 0,
            revenue: 0
          };
        }
        productSoldCounter[item.productId].qty += item.quantity;
        productSoldCounter[item.productId].revenue += item.price * item.quantity;
      });
    });

    const bestSellers = Object.entries(productSoldCounter)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Categories Breakdown
    const categoryBreakdown = {
      coffee: 0,
      'non-coffee': 0,
      food: 0,
      pastry: 0
    };

    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const originalProd = products.find(p => p.id === item.productId);
        const cat = originalProd?.category || 'coffee';
        if (cat in categoryBreakdown) {
          categoryBreakdown[cat] += item.price * item.quantity;
        }
      });
    });

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      totalDiscountGiven,
      bestSellers,
      categoryBreakdown
    };
  }, [filteredTransactions, products]);

  // Generate gorgeous graph coordinates for daily sales
  const graphData = useMemo(() => {
    // Collect the past 7 days dates starting from today
    const daysArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daysArr.push({
        dateString: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        revenue: 0,
        txCount: 0
      });
    }

    // Populate actual revenues
    transactions.forEach(tx => {
      const txDateStr = tx.createdAt.split('T')[0];
      const foundDayIdx = daysArr.findIndex(day => day.dateString === txDateStr);
      if (foundDayIdx !== -1) {
        daysArr[foundDayIdx].revenue += tx.total;
        daysArr[foundDayIdx].txCount += 1;
      }
    });

    const maxRevenue = Math.max(...daysArr.map(d => d.revenue), 100000); // safety fallback

    return daysArr.map(d => ({
      ...d,
      heightPercentage: Math.max((d.revenue / maxRevenue) * 100, 6) // baseline 6% height to be visible
    }));
  }, [transactions]);

  const showRecentTransactions = filteredTransactions.slice(0, 5);

  const [graphType, setGraphType] = useState<'area' | 'bar'>('area');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Compute SVG coordinates reactive to graphData
  const svgData = useMemo(() => {
    const width = 680;
    const height = 240;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxRevenue = Math.max(...graphData.map(d => d.revenue), 100000);

    const points = graphData.map((d, i) => {
      const x = paddingLeft + (i * (chartWidth / (graphData.length - 1 || 1)));
      const ratio = d.revenue / maxRevenue;
      const y = height - paddingBottom - (ratio * chartHeight);
      return { x, y, ...d };
    });

    // Build SVG Path strings using simple curves or fallback line paths
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      // Build a beautiful smooth bezier curve
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
        const cpY1 = points[i - 1].y;
        const cpX2 = points[i - 1].x + 2 * (points[i].x - points[i - 1].x) / 3;
        const cpY2 = points[i].y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
      }
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    return {
      points,
      linePath,
      areaPath,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      width,
      height,
      chartWidth,
      chartHeight,
      maxRevenue
    };
  }, [graphData]);

  // Dynamic statistics on peak hours based on transaction createdAt hour
  const peakHourStats = useMemo(() => {
    const hoursCount = {
      morning: { label: 'Pagi Hari (06:00 - 11:00)', count: 0, revenue: 0, icon: '🌅' },
      lunch: { label: 'Makan Siang (11:00 - 15:00)', count: 0, revenue: 0, icon: '☀️' },
      afternoon: { label: 'Sore Nyantai (15:00 - 18:00)', count: 0, revenue: 0, icon: '☕' },
      night: { label: 'Malam Gabung (18:00 - 24:00)', count: 0, revenue: 0, icon: '🌙' }
    };

    filteredTransactions.forEach(tx => {
      const date = new Date(tx.createdAt);
      const hour = date.getHours();
      
      if (hour >= 6 && hour < 11) {
        hoursCount.morning.count++;
        hoursCount.morning.revenue += tx.total;
      } else if (hour >= 11 && hour < 15) {
        hoursCount.lunch.count++;
        hoursCount.lunch.revenue += tx.total;
      } else if (hour >= 15 && hour < 18) {
        hoursCount.afternoon.count++;
        hoursCount.afternoon.revenue += tx.total;
      } else {
        hoursCount.night.count++;
        hoursCount.night.revenue += tx.total;
      }
    });

    const totalRevenue = Object.values(hoursCount).reduce((sum, h) => sum + h.revenue, 0) || 1;

    return Object.entries(hoursCount).map(([key, data]) => ({
      key,
      ...data,
      percentage: Math.round((data.revenue / totalRevenue) * 100)
    }));
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      
      {/* Header section with Filter controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-coffee-200/80">
        <div>
          <h2 className="text-xl font-bold text-coffee-950 flex items-center gap-2">
            Ringkasan Penjualan Kopi Klasik
          </h2>
          <p className="text-xs text-coffee-600 mt-0.5">Pantau pendapatan harian, performa staf, dan status produk terlaris.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Calendar className="w-4 h-4 text-coffee-600" />
          <span className="text-xs font-semibold text-coffee-800">Rentang Laporan:</span>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-3 pr-8 py-1.5 text-xs font-semibold text-coffee-900 bg-coffee-50 border border-coffee-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-coffee-500 appearance-none cursor-pointer"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
            <ChevronDown className="w-3 h-3 text-coffee-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* TODAY'S INSTANT REAL-TIME STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1: TODAY'S REVENUE SUMMARY */}
        <div className="bg-white p-5 rounded-2xl border border-coffee-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-coffee-100 text-coffee-800 rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-coffee-600 tracking-wide uppercase">PENDAPATAN HARI INI</span>
            <span className="block text-xl font-extrabold text-coffee-900 mt-1">{formatIDR(todayStats.revenue)}</span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-sage-600 font-medium font-sans">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Sistem Kasir Real-time</span>
            </div>
          </div>
        </div>

        {/* KPI 2: TOTAL TRANSAKSI */}
        <div className="bg-white p-5 rounded-2xl border border-coffee-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-sage-100 text-sage-700 rounded-xl shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-coffee-600 tracking-wide uppercase">TRANSAKSI HARI INI</span>
            <span className="block text-xl font-extrabold text-coffee-900 mt-1">{todayStats.count} Nota</span>
            <p className="text-[10px] text-coffee-500 mt-1">Dicatat oleh kasir aktif</p>
          </div>
        </div>

        {/* KPI 3: TOTAL INCOME IN RANGE */}
        <div className="bg-gradient-to-br from-coffee-800 to-coffee-900 p-5 rounded-2xl text-white shadow-md flex items-start gap-4">
          <div className="p-3 bg-white/10 text-cream-100 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-cream-200 tracking-wider uppercase">
              REVENUE ({timeRange === 'today' ? 'HARI INI' : timeRange === '7days' ? '7 HARI' : '30 HARI'})
            </span>
            <span className="block text-xl font-extrabold text-cream-50 mt-1">{formatIDR(rangeStats.totalRevenue)}</span>
            <span className="block text-[10px] text-cream-200/80 mt-1">Nota: {rangeStats.totalTransactions} Transaksi filter</span>
          </div>
        </div>

        {/* KPI 4: STOCKS AT RISK WARNING */}
        <div className="bg-white p-5 rounded-2xl border border-coffee-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0 border border-amber-200/50">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-coffee-600 tracking-wide uppercase">TERLARIS PERIODE INI</span>
            <span className="block text-sm font-bold text-coffee-950 mt-1 truncate max-w-[160px]">
              {rangeStats.bestSellers[0]?.name || 'Belum ada data'}
            </span>
            <p className="text-[10px] text-coffee-500 mt-1.5 flex items-center gap-1 font-sans">
              <Coffee className="w-3 h-3 text-coffee-500" />
              <span>Banyak dipesan oleh pelanggan</span>
            </p>
          </div>
        </div>

      </div>

      {/* GRAPHS AND CHARTS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPH: DAILY REVENUE CHART (7 DAYS TREND) */}
        <div className="bg-white p-6 rounded-2xl border border-coffee-200 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
            <div>
              <h4 className="font-bold text-coffee-950 text-sm">Grafik Analisis Penjualan</h4>
              <p className="text-[11px] text-coffee-500">Bilah perbandingan pendapatan harian & tren omset mingguan</p>
            </div>
            
            {/* Visual selector - Geometric style toggles */}
            <div className="flex items-center gap-1 bg-coffee-100/50 p-0.5 rounded-xl self-start sm:self-center border border-coffee-200/40">
              <button
                type="button"
                onClick={() => setGraphType('area')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphType === 'area'
                    ? 'bg-coffee-800 text-white shadow-sm'
                    : 'text-coffee-700 hover:text-coffee-900 hover:bg-coffee-100/40'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Tren Area</span>
              </button>
              <button
                type="button"
                onClick={() => setGraphType('bar')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  graphType === 'bar'
                    ? 'bg-coffee-800 text-white shadow-sm'
                    : 'text-coffee-700 hover:text-coffee-900 hover:bg-coffee-100/40'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Diagram Batang</span>
              </button>
            </div>
          </div>

          {/* Interactive Graph Display */}
          <div className="relative flex-1 select-none min-h-[240px]">
            {graphType === 'area' ? (
              <div className="w-full h-full relative">
                {/* SVG curve path */}
                <svg
                  viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                  className="w-full h-full overflow-visible"
                  style={{ minHeight: '240px' }}
                >
                  <defs>
                    {/* Golden/Warm brown gradient fill */}
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B4513" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D2B48C" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = svgData.paddingTop + (ratio * svgData.chartHeight);
                    const value = Math.round(svgData.maxRevenue * (1 - ratio));
                    return (
                      <g key={i} className="opacity-40">
                        <line
                          x1={svgData.paddingLeft}
                          y1={y}
                          x2={svgData.width - svgData.paddingRight}
                          y2={y}
                          stroke="#E8DBBE"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={svgData.paddingLeft - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[9px] font-bold font-mono fill-coffee-700"
                        >
                          {value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${Math.round(value / 1000)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Hover guideline */}
                  {hoveredPointIndex !== null && svgData.points[hoveredPointIndex] && (
                    <line
                      x1={svgData.points[hoveredPointIndex].x}
                      y1={svgData.paddingTop}
                      x2={svgData.points[hoveredPointIndex].x}
                      y2={svgData.height - svgData.paddingBottom}
                      stroke="#8B4513"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      className="transition-all duration-150"
                    />
                  )}

                  {/* Gradient Area Fill */}
                  {svgData.areaPath && (
                    <path
                      d={svgData.areaPath}
                      fill="url(#areaGradient)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Colored Line Curve */}
                  {svgData.linePath && (
                    <path
                      d={svgData.linePath}
                      fill="none"
                      stroke="#8B4513"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Interactive Nodes */}
                  {svgData.points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPointIndex === idx ? "7" : "4.5"}
                        fill={hoveredPointIndex === idx ? "#2D5A27" : "#8B4513"}
                        stroke="#FFF"
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-150 shadow-sm"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                      />
                      {/* Floating mini currency indicator */}
                      {p.revenue > 0 && hoveredPointIndex !== idx && (
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          className="text-[9px] font-bold font-mono fill-coffee-900"
                        >
                          {Math.round(p.revenue / 1000)}k
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Base timeline labels axis */}
                  <line
                    x1={svgData.paddingLeft}
                    y1={svgData.height - svgData.paddingBottom}
                    x2={svgData.width - svgData.paddingRight}
                    y2={svgData.height - svgData.paddingBottom}
                    stroke="#D2B48C"
                    strokeWidth="1.5"
                  />
                  {svgData.points.map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y={svgData.height - svgData.paddingBottom + 18}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-coffee-800 uppercase"
                    >
                      {p.label}
                    </text>
                  ))}
                </svg>

                {/* Vertical overlay bars for massive hover ease */}
                <div className="absolute inset-0 flex" style={{ paddingLeft: `${svgData.paddingLeft}px`, paddingRight: `${svgData.paddingRight}px`, paddingTop: `${svgData.paddingTop}px`, paddingBottom: `${svgData.paddingBottom}px` }}>
                  {svgData.points.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-full cursor-pointer relative"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {hoveredPointIndex === idx && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-coffee-950 text-white font-sans text-center rounded-xl py-1.5 px-3 shadow-xl z-20 pointer-events-none min-w-[130px] border border-coffee-400/40">
                          <p className="text-[9px] text-[#D2B48C] font-extrabold tracking-wider uppercase">{p.label}</p>
                          <p className="text-xs font-extrabold text-[#FDF8F2] mt-0.5">{formatIDR(p.revenue)}</p>
                          <p className="text-[8px] text-[#E8DBBE] mt-0.5">({p.txCount} Nota Terbit)</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Custom Elegant Columns */
              <div className="pt-4 h-full flex flex-col justify-between">
                <div className="relative flex-1 min-h-[220px]">
                  {/* Grid background */}
                  <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-dashed border-coffee-101/75 w-full"></div>
                    <div className="border-t border-dashed border-coffee-101/75 w-full"></div>
                    <div className="border-t border-dashed border-coffee-101/75 w-full"></div>
                    <div className="border-b border-coffee-200 w-full mb-8"></div>
                  </div>

                  {/* Columns */}
                  <div className="absolute inset-x-0 bottom-8 top-0 flex items-end justify-between gap-3 px-3 z-10 transition-all">
                    {graphData.map((day, idx) => (
                      <div
                        key={day.dateString}
                        className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        {/* Interactive dynamic floating value indicator */}
                        <div className={`absolute -top-12 bg-coffee-900 text-white text-center py-1.5 px-2.5 rounded-lg shadow-lg z-20 pointer-events-none transition-all ${
                          hoveredPointIndex === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}>
                          <span className="block text-[8px] text-cream-200 font-extrabold tracking-wider uppercase mb-0.5">{day.label}</span>
                          <span className="text-xs font-black text-white">{formatIDR(day.revenue)}</span>
                          <span className="block text-[8px] text-cream-300">({day.txCount} Transaksi)</span>
                        </div>

                        {/* Solid Column */}
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 relative ${
                            hoveredPointIndex === idx ? 'bg-[#2D5A27]' : 'bg-[#8B4513]'
                          }`}
                          style={{ height: `${day.heightPercentage}%` }}
                        >
                          <div className="absolute top-1 inset-x-1 h-1 bg-white/20 rounded-full"></div>
                        </div>

                        {/* Static pill code tag */}
                        {day.revenue > 0 && (
                          <span className="text-[10px] font-bold font-mono text-coffee-800 mt-1.5 bg-coffee-100/60 px-1.5 py-0.5 rounded">
                            {Math.round(day.revenue / 1000)}k
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between text-[10px] font-bold text-coffee-800 border-t border-coffee-200 pt-3 px-3">
                  {graphData.map((day) => (
                    <span key={day.dateString} className="text-center flex-1">{day.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CHART: PIE/CATEGORIES SUMMARY + JAM SIBUK KASIR */}
        <div className="bg-white p-6 rounded-2xl border border-coffee-200 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-coffee-950 text-sm">Distribusi Kategori Produk</h4>
              <p className="text-[11px] text-coffee-500">Pembagian omset menu Klasik Bean & Brew</p>
            </div>

            <div className="space-y-2.5">
              {Object.entries(rangeStats.categoryBreakdown).map(([cat, totalVal]) => {
                const total = totalVal as number;
                const breakdown = rangeStats.categoryBreakdown as Record<string, number>;
                const sumRevenue = (Object.values(breakdown) as number[]).reduce((a, b) => a + b, 0) || 1;
                const percent = Math.round((total / sumRevenue) * 100);
                
                const catLabel = cat === 'coffee' ? '☕ Kopi Klasik' : 
                                 cat === 'non-coffee' ? '🍵 Non-Kopi' : 
                                 cat === 'food' ? '🍛 Makanan Berat' : '🥐 Pastry Renyah';

                const barColor = cat === 'coffee' ? 'bg-[#8B4513]' :
                                 cat === 'non-coffee' ? 'bg-[#2D5A27]' :
                                 cat === 'food' ? 'bg-[#C19A6B]' : 'bg-amber-600';

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-coffee-900">{catLabel}</span>
                      <span className="font-mono text-coffee-700 font-semibold">
                        {percent}% ({formatIDR(total)})
                      </span>
                    </div>
                    <div className="h-1.5 bg-coffee-50 rounded-full overflow-hidden border border-coffee-100">
                      <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-coffee-100 pt-4 space-y-3">
            <div>
              <h5 className="font-bold text-coffee-950 text-xs flex items-center gap-1.5">
                <span>⏱️</span> Analisis Jam Sibuk Pelanggan
              </h5>
              <p className="text-[10px] text-coffee-500">Rentang waktu dengan volume transaksi tertinggi</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {peakHourStats.map((item) => (
                <div key={item.key} className="p-2 bg-coffee-50/60 rounded-xl border border-coffee-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{item.icon}</span>
                    <span className="text-[9px] font-bold text-coffee-700 leading-none truncate max-w-[80px]">{item.label}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-extrabold text-[#2D5A27] font-mono">{item.percentage}%</span>
                    <span className="text-[8px] text-coffee-500 font-medium">({item.count} order)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* BEST SELLERS AND RECENT SALES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TAB 1: BEST SELLERS LIST */}
        <div className="bg-white p-6 rounded-2xl border border-coffee-200">
          <h4 className="font-bold text-coffee-950 text-sm mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Produk Terlaris Terjual Banyak
          </h4>
          <div className="divide-y divide-coffee-100">
            {rangeStats.bestSellers.length > 0 ? (
              rangeStats.bestSellers.map((item, index) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-coffee-100 text-xs font-bold text-coffee-850 font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <span className="block text-xs font-bold text-coffee-900">{item.name}</span>
                      <span className="text-[10px] text-coffee-500 capitalize">{item.category} Category</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-coffee-900 font-mono">{item.qty} Pcs Terjual</span>
                    <span className="text-[10px] text-sage-600 font-semibold">{formatIDR(item.revenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-coffee-500 py-4 text-center">Belum ada data barang terjual pada rentang ini.</p>
            )}
          </div>
        </div>

        {/* TAB 2: RECENT TRANSACTIONS */}
        <div className="bg-white p-6 rounded-2xl border border-coffee-200">
          <h4 className="font-bold text-coffee-950 text-sm mb-4 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-coffee-700" /> Riwayat Penjualan Terbaru
          </h4>
          <div className="space-y-3">
            {showRecentTransactions.length > 0 ? (
              showRecentTransactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-coffee-50 rounded-xl border border-coffee-200/50 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-coffee-900">{tx.invoiceNumber}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-sage-100 border border-sage-200 text-sage-800 font-bold rounded">
                        {tx.paymentMethod}
                      </span>
                    </div>
                    <span className="block text-[10px] text-coffee-500 mt-0.5">
                      Staf: {tx.cashierName} • {new Date(tx.createdAt).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-extrabold text-coffee-950 font-mono">{formatIDR(tx.total)}</span>
                    <span className="text-[9px] text-coffee-500 font-sans">{tx.items.length} Barang</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-coffee-500 py-4 text-center">Belum ada riwayat nota transaksi hari ini.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
