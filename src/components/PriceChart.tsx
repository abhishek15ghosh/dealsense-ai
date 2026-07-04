'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { PriceHistoryPoint } from '@/data/mockProducts';

interface PriceChartProps {
  data: PriceHistoryPoint[];
  forecast?: Array<{ date: string; price: number }>;
  verifiedStores?: string[];
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1.5">
        <p className="font-bold text-slate-300 font-display mb-1">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center space-x-2">
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-slate-100">
              ₹{entry.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PriceChart({ data, forecast = [], verifiedStores }: PriceChartProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'forecast'>('history');
  const [activeStores, setActiveStores] = useState({
    Amazon: true,
    Flipkart: true,
    Croma: true,
    'Reliance Digital': true,
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const storeExists = (storeName: string) => {
    if (!verifiedStores) return true;
    return verifiedStores.some(s => s.toLowerCase() === storeName.toLowerCase());
  };

  const storeColors = {
    Amazon: '#FF9900',
    Flipkart: '#2874F0',
    Croma: '#008080',
    'Reliance Digital': '#E4252A',
  };

  const toggleStore = (store: keyof typeof activeStores) => {
    setActiveStores((prev) => ({
      ...prev,
      [store]: !prev[store],
    }));
  };

  // Formatting currency for Y axis
  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 1000).toFixed(0)}k`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const displayedData = 
    timeRange === '7d' ? data.slice(-7) : 
    timeRange === '30d' ? data.slice(-30) : 
    timeRange === '90d' ? data.slice(-90) : 
    data;

  const getSubText = () => {
    if (activeTab === 'forecast') {
      return 'Projected lowest price trajectory for the next 7 days using AI modeling';
    }
    switch (timeRange) {
      case '7d':
        return 'Compare historical rates over the last 7 days';
      case '30d':
        return 'Compare historical rates over the last 30 days';
      case '90d':
        return 'Compare historical rates over the last 90 days';
      case 'all':
        return 'Compare all recorded historical rates';
    }
  };

  const showForecastTab = forecast && forecast.length > 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      {/* Tab Switcher */}
      {showForecastTab && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Price History
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`pb-3 px-4 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'forecast'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>AI Price Forecast</span>
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800">
              {activeTab === 'forecast' ? 'AI Pricing Projections' : 'Price History Trends'}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {getSubText()}
            </p>
          </div>

          {/* Time Range Toggle (only visible in History tab) */}
          {activeTab === 'history' && (
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 w-fit">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all ${
                  timeRange === '7d'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all ${
                  timeRange === '30d'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all ${
                  timeRange === '90d'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all ${
                  timeRange === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
            </div>
          )}
        </div>

        {/* Brand Toggles (only visible in History tab) */}
        {activeTab === 'history' && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(activeStores) as Array<keyof typeof activeStores>).filter(storeExists).map((store) => {
              const isActive = activeStores[store];
              const color = storeColors[store];
              return (
                <button
                  key={store}
                  onClick={() => toggleStore(store)}
                  style={{ 
                    borderColor: isActive ? color : '#e2e8f0',
                    backgroundColor: isActive ? `${color}10` : 'transparent',
                    color: isActive ? color : '#64748b'
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all duration-150"
                >
                  <span 
                    className="w-2 h-2 rounded-full inline-block" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{store}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recharts responsive block */}
      <div className="h-72 w-full">
        {activeTab === 'forecast' ? (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart
              data={forecast}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                dx={-5}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-slate-300 font-display mb-1">{label}</p>
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                          <span className="text-slate-400">Projected Price:</span>
                          <span className="font-semibold text-slate-100">
                            ₹{payload[0].value?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#grad-forecast)"
                name="Projected Price"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart
              data={displayedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {Object.keys(storeColors).map((store) => {
                  const color = storeColors[store as keyof typeof storeColors];
                  const safeId = store.replace(/\s+/g, '-');
                  return (
                    <linearGradient key={store} id={`grad-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {(Object.keys(activeStores) as Array<keyof typeof activeStores>).filter(storeExists).map((store) => {
                if (!activeStores[store]) return null;
                const color = storeColors[store];
                const safeId = store.replace(/\s+/g, '-');
                return (
                  <Area
                    key={store}
                    type="monotone"
                    dataKey={store}
                    stroke={color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#grad-${safeId})`}
                    name={store}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
