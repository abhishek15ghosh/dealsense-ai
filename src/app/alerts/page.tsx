'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { mockProducts } from '@/data/mockProducts';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, Search, Trash2, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AlertsPage() {
  const { alerts, removeAlert, markAllAlertsAsRead } = useApp();
  const [activeTab, setActiveTab] = React.useState<'all' | 'latest' | 'active' | 'triggered'>('all');

  // Automatically mark all alerts as read when visiting the alerts page
  React.useEffect(() => {
    if (markAllAlertsAsRead) {
      markAllAlertsAsRead();
    }
  }, [markAllAlertsAsRead]);

  // Separate active and triggered alerts
  const activeAlerts = alerts.filter(a => {
    // Price drop alerts are considered already triggered
    if (a.oldPrice !== undefined) return false;

    const product = mockProducts.find(p => p.id === a.productId);
    const currentPrice = a.currentPrice || (product ? product.bestDealPrice : a.currentPriceAtSet);
    const isTriggered = a.status === 'triggered' || (a.targetPrice !== undefined && currentPrice <= a.targetPrice);
    return a.status === 'active' && !isTriggered;
  });
  
  const triggeredAlerts = alerts.filter(a => {
    // Price drop alerts are triggered
    if (a.oldPrice !== undefined) return true;

    const product = mockProducts.find(p => p.id === a.productId);
    const currentPrice = a.currentPrice || (product ? product.bestDealPrice : a.currentPriceAtSet);
    const isTriggered = a.status === 'triggered' || (a.targetPrice !== undefined && currentPrice <= a.targetPrice);
    return a.status === 'triggered' || (a.status === 'active' && isTriggered);
  });

  const now = new Date();
  const latestTriggeredAlerts = alerts.filter(a => {
    const isTriggered = a.oldPrice !== undefined || a.status === 'triggered';
    if (!isTriggered) return false;
    
    // Check if triggered or created in the last 24 hours
    const triggeredTime = a.triggeredAt ? new Date(a.triggeredAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    return now.getTime() - triggeredTime <= 24 * 60 * 60 * 1000;
  });

  const getFilteredAlerts = () => {
    switch (activeTab) {
      case 'latest':
        return latestTriggeredAlerts;
      case 'active':
        return activeAlerts;
      case 'triggered':
        return triggeredAlerts;
      case 'all':
      default:
        return alerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  const isAlertTriggered = (a: typeof alerts[0]) => {
    if (a.oldPrice !== undefined) return true;
    const product = mockProducts.find(p => p.id === a.productId);
    const currentPrice = a.currentPrice || (product ? product.bestDealPrice : a.currentPriceAtSet);
    return a.status === 'triggered' || (a.targetPrice !== undefined && currentPrice <= a.targetPrice);
  };

  const renderAlertCard = (alert: typeof alerts[0], isTriggered: boolean) => {
    // Look up current product best price
    const product = mockProducts.find(p => p.id === alert.productId);
    const currentPrice = alert.currentPrice || (product ? product.bestDealPrice : alert.currentPriceAtSet);

    const isPriceDropAlert = alert.oldPrice !== undefined;
    const resolvedImage = alert.productImage || (product ? product.image : `/images/${alert.productId}.png`);

    return (
      <div 
        key={alert.id}
        className={`bg-white border rounded-3xl p-5 shadow-sm transition duration-200 flex flex-col justify-between space-y-4 hover:shadow-md ${
          isTriggered || isPriceDropAlert
            ? 'border-green-200/80 bg-green-50/5' 
            : 'border-slate-200'
        }`}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-extrabold uppercase text-slate-400">
              {isPriceDropAlert ? `Retailer: ${alert.storeName || 'General'}` : `Platform: ${alert.storeName}`}
            </span>
            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-bold ${
              isTriggered || isPriceDropAlert
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {isTriggered || isPriceDropAlert ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
              <span>{isPriceDropAlert ? 'Price Drop' : isTriggered ? 'Triggered' : 'Monitoring'}</span>
            </span>
          </div>
 
          {/* Info */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center flex-shrink-0">
              <Image 
                src={resolvedImage} 
                alt={alert.productName || 'Product'} 
                width={48}
                height={48}
                className="object-contain max-h-full max-w-full"
              />
            </div>
            <Link 
              href={`/product/${alert.productId}`}
              className="font-display font-extrabold text-xs text-slate-800 hover:text-blue-600 transition line-clamp-2 leading-snug"
            >
              {alert.productName}
            </Link>
          </div>
 
          {/* Threshold Matrix / Price Info */}
          {isPriceDropAlert ? (
            <div className="border-t border-slate-100 pt-3 grid grid-cols-3 gap-2 text-xs font-semibold">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Old Price</span>
                <p className="text-slate-500 line-through">
                  ₹{alert.oldPrice?.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">New Price</span>
                <p className="text-green-600 font-extrabold">
                  ₹{alert.newPrice?.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Savings</span>
                <p className="text-blue-650 font-black">
                  ₹{alert.savings?.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Limit</span>
                <p className="text-slate-800 font-bold">
                  ₹{alert.targetPrice.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Price</span>
                <p className={`font-bold ${isTriggered ? 'text-green-600 font-extrabold' : 'text-slate-700'}`}>
                  ₹{currentPrice.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
        </div>
 
        {/* Buttons */}
        <div className="border-t border-slate-100 pt-3 flex gap-2">
          <button
            onClick={() => removeAlert(alert.id)}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-500 transition duration-150 text-xs font-bold"
          >
            <Trash2 size={12} />
            <span>Cancel Alert</span>
          </button>
          
          <Link
            href={`/product/${alert.productId}`}
            className="px-3 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition duration-150"
            title="View comparison grid"
          >
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  };
 
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">
            Target Price Alerts
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage alerts and notifications of target price drop events
          </p>
        </div>
 
        {alerts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Bell size={20} />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-700">No Alerts Configured</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Define target prices on details pages. We will check listing quotes and notify you as soon as they drop.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/10"
            >
              <Search size={14} />
              <span>Explore Deals</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs Filter Bar */}
            <div className="flex flex-wrap border-b border-slate-200 gap-6 pb-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>All Alerts</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === 'all' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'
                }`}>
                  {alerts.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('latest')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  activeTab === 'latest'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>Latest Triggered</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === 'latest' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'
                }`}>
                  {latestTriggeredAlerts.length}
                </span>
              </button>
 
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  activeTab === 'active'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>Active Alerts</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'
                }`}>
                  {activeAlerts.length}
                </span>
              </button>
 
              <button
                onClick={() => setActiveTab('triggered')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 ${
                  activeTab === 'triggered'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>Triggered Alerts</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === 'triggered' ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'
                }`}>
                  {triggeredAlerts.length}
                </span>
              </button>
            </div>
 
            {/* Filtered Alerts Cards Grid */}
            {filteredAlerts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell size={20} />
                </div>
                <h3 className="font-display font-bold text-sm text-slate-700">No Alerts Found</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                  There are no alerts matching the selected tab filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlerts.map(a => renderAlertCard(a, isAlertTriggered(a)))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
