'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { mockProducts } from '@/data/mockProducts';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Search, 
  Heart, 
  Bell, 
  ArrowUpRight, 
  Cpu, 
  BadgePercent, 
  ArrowRight,
  Info,
  Sparkles,
  AlertCircle,
  ArrowDown,
  Activity,
  Play,
  CheckCircle2
} from 'lucide-react';

interface DashboardProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewsCount: number;
  bestDealStore: string;
  bestDealPrice: number;
  lowestRecordedPrice?: number;
  highestRecordedPrice?: number;
  priceTrend?: 'up' | 'down' | 'stable';
  prices: Array<{
    storeName: string;
    price: number;
    originalPrice: number;
    url: string;
    inStock: boolean;
    deliveryDays: number;
  }>;
  aiRecommendation: {
    decision: 'BUY NOW' | 'WAIT' | 'AVOID' | 'BUY_NOW';
    confidence: number;
    reasoning: string[];
    summary: string;
    expectedBetterPriceRange?: string;
    bestPlatform?: string;
  };
  dropAmount?: number;
  dropPercent?: number;
  discountPercent?: number;
}

interface InsightsData {
  biggestDrops: DashboardProduct[];
  trendingDeals: DashboardProduct[];
  recentlyDiscounted: DashboardProduct[];
  avgDiscount: number;
}

// Fallback calculations using mockProducts
const getFallbackInsights = (): InsightsData => {
  const fullProducts = mockProducts.map((p) => {
    const doc = p;
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      image: doc.image,
      category: doc.category,
      rating: doc.rating,
      reviewsCount: doc.reviewsCount,
      bestDealStore: doc.bestDealStore,
      bestDealPrice: doc.bestDealPrice,
      lowestRecordedPrice: doc.bestDealPrice,
      highestRecordedPrice: doc.bestDealPrice * 1.15,
      priceTrend: 'stable' as const,
      prices: doc.prices,
      priceHistory: doc.priceHistory,
      aiRecommendation: doc.aiRecommendation as {
        decision: 'BUY NOW' | 'WAIT' | 'AVOID' | 'BUY_NOW';
        confidence: number;
        reasoning: string[];
        summary: string;
        expectedBetterPriceRange?: string;
        bestPlatform?: string;
      }
    };
  });

  const biggestDrops = [...fullProducts]
    .map((p) => {
      const originalPrice = p.prices.length > 0 ? p.prices[0].originalPrice : p.bestDealPrice * 1.15;
      const dropAmount = originalPrice - p.bestDealPrice;
      const dropPercent = originalPrice > 0 ? Math.round((dropAmount / originalPrice) * 100) : 0;
      return { ...p, dropAmount, dropPercent };
    })
    .sort((a, b) => b.dropAmount - a.dropAmount)
    .slice(0, 6);

  const trendingDeals = [...fullProducts]
    .filter((p) => p.aiRecommendation.decision === 'BUY NOW' || p.aiRecommendation.decision === 'BUY_NOW')
    .sort((a, b) => b.aiRecommendation.confidence - a.aiRecommendation.confidence)
    .slice(0, 4);

  const recentlyDiscounted = [...fullProducts]
    .map((p) => {
      const originalPrice = p.prices.length > 0 ? p.prices[0].originalPrice : p.bestDealPrice * 1.15;
      const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - p.bestDealPrice) / originalPrice) * 100) : 0;
      return { ...p, discountPercent };
    })
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 6);

  const totalDiscountPct = fullProducts.reduce((acc, curr) => {
    const original = curr.prices.length > 0 ? curr.prices[0].originalPrice : curr.bestDealPrice * 1.15;
    const discount = original > 0 ? ((original - curr.bestDealPrice) / original) * 100 : 0;
    return acc + discount;
  }, 0);
  const avgDiscount = fullProducts.length > 0 ? Math.round(totalDiscountPct / fullProducts.length) : 0;

  return {
    biggestDrops,
    trendingDeals,
    recentlyDiscounted,
    avgDiscount
  };
};

export default function Dashboard() {
  const router = useRouter();
  const { watchlist, alerts, notifications, markAsRead } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [systemStatus, setSystemStatus] = useState<{
    lastRunAt: string;
    nextRunAt: string;
    alertsChecked: number;
    alertsTriggered: number;
    emailsSent: number;
    errorLogs: string[];
  } | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch scheduler status on mount
  useEffect(() => {
    let active = true;
    fetch('/api/system/status')
      .then((res) => res.json())
      .then((resData) => {
        if (!active) return;
        if (resData.success && resData.data) {
          setSystemStatus(resData.data);
        }
      })
      .catch((err) => console.error('Error fetching system status:', err));
    return () => {
      active = false;
    };
  }, []);

  // Handle toast timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleRunPriceCheck = async () => {
    setRunningCheck(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/system/run-price-check', { method: 'POST' });
      const resData = await res.json();
      if (resData.success) {
        setToastMessage({
          type: 'success',
          text: `Price check completed! Checked ${resData.data.alertsChecked} alerts, triggered ${resData.data.alertsTriggered}.`
        });
        
        // Re-fetch system status
        const statusRes = await fetch('/api/system/status');
        const statusData = await statusRes.json();
        if (statusData.success && statusData.data) {
          setSystemStatus(statusData.data);
        }
      } else {
        setToastMessage({ type: 'error', text: `Price check failed: ${resData.error}` });
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: `Price check request failed: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setRunningCheck(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetch('/api/dashboard/insights')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load dashboard insights.');
        }
        return res.json();
      })
      .then((resData) => {
        if (!active) return;
        if (resData.success && resData.data) {
          setInsights(resData.data);
        } else {
          console.warn('Dashboard insights fetch not successful, using fallback.');
          setInsights(getFallbackInsights());
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard insights, using fallback:', err);
        if (!active) return;
        setInsights(getFallbackInsights());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading || !insights) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center text-slate-400 font-semibold space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Syncing dashboard metrics...</span>
        </div>
      </DashboardLayout>
    );
  }

  // KPI Calculations
  const watchlistCount = watchlist.length;
  const activeAlertsCount = alerts.filter((a) => {
    const product = mockProducts.find(p => p.id === a.productId);
    const currentPrice = a.currentPrice || (product ? product.bestDealPrice : a.currentPriceAtSet);
    const isTriggered = a.status === 'triggered' || currentPrice <= a.targetPrice;
    return a.status === 'active' && !isTriggered;
  }).length;

  return (
    <DashboardLayout>
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 w-[30%] h-full bg-gradient-to-l from-blue-600/30 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-xl">
          <h2 className="text-3xl font-display font-black tracking-tight leading-tight">
            Find the absolute lowest price across major retail giants
          </h2>
          <p className="text-slate-300 text-xs">
            We scan Amazon, Flipkart, Croma, and Reliance Digital in real-time, giving you historic charts and AI purchasing strategies.
          </p>
          <form onSubmit={handleSearchSubmit} className="relative max-w-md pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search gadgets, smartphones, laptops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-3.5 bg-white text-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-150"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Discount</span>
            <p className="text-3xl font-display font-black text-slate-800">{insights.avgDiscount}% Off</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-600">
            <BadgePercent size={24} />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Watchlist Items</span>
            <p className="text-3xl font-display font-black text-slate-800">{watchlistCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Heart size={24} />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Alerts</span>
            <p className="text-3xl font-display font-black text-slate-800">{activeAlertsCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle size={24} />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Unread Notifications</span>
            <p className="text-3xl font-display font-black text-slate-800">
              {notifications.filter(n => n.isRead === false).length}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Bell size={24} />
          </div>
        </div>
      </div>

      {/* Monitoring Engine Control Deck */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Activity size={24} className={runningCheck ? "animate-pulse" : ""} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-bold text-slate-800 text-sm">AI DealSense Monitoring Engine</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Tracks prices automatically every 15 minutes, matches targets, alerts users, and dispatches dynamic emails.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[10px] font-semibold text-slate-500">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Last Checked</span>
              <span className="text-slate-750 font-black text-xs">
                {systemStatus?.lastRunAt 
                  ? new Date(systemStatus.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : 'Never'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Next Scheduled Check</span>
              <span className="text-slate-750 font-black text-xs">
                {systemStatus?.nextRunAt 
                  ? new Date(systemStatus.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : 'In 15 minutes'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Alerts Checked</span>
              <span className="text-slate-800 font-black text-xs">{systemStatus?.alertsChecked ?? 0}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Alerts Triggered</span>
              <span className="text-slate-800 font-black text-xs">{systemStatus?.alertsTriggered ?? 0}</span>
            </div>
          </div>

          <button
            onClick={handleRunPriceCheck}
            disabled={runningCheck}
            className={`px-5 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-md shadow-blue-500/10 flex items-center space-x-2 ${
              runningCheck 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {runningCheck ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                <span>Scanning Retailers...</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" />
                <span>Run Price Check Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
          toastMessage.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Grid split: AI Recommendations + Recent Drops */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Top Recommended Deals (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-800">
                Top AI Buy Recommendations
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Handpicked options that are currently at historic price drops
              </p>
            </div>
            <Link
              href="/search"
              className="flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold transition"
            >
              <span>Explore all</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {insights.trendingDeals.map((product) => {
              const originalPrice = product.prices.length > 0 ? product.prices[0].originalPrice : product.bestDealPrice;
              const savedPct = Math.round(
                ((originalPrice - product.bestDealPrice) / originalPrice) * 100
              );
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition duration-200 p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[10px] font-bold">
                        <Cpu size={10} className="fill-green-600/10" />
                        <span>AI RECOMMENDS: BUY</span>
                      </span>
                      <span className="text-slate-400 font-bold text-[10px] uppercase">
                        {product.category}
                      </span>
                    </div>

                    <Link 
                      href={`/product/${product.id}`}
                      className="block font-display font-bold text-sm text-slate-800 hover:text-blue-600 transition line-clamp-2"
                    >
                      {product.name}
                    </Link>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-base font-black text-slate-800">
                        ₹{product.bestDealPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-green-600 font-bold">
                        ({savedPct}% saved)
                      </span>
                    </div>

                    {/* Projections & Platforms */}
                    {product.aiRecommendation.expectedBetterPriceRange && (
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 font-semibold border border-slate-100">
                        <span>Target Range:</span>
                        <span className="text-slate-800 font-extrabold">{product.aiRecommendation.expectedBetterPriceRange}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                    <div className="text-slate-500">
                      Best on: <span className="font-bold text-slate-700">{product.aiRecommendation.bestPlatform || product.bestDealStore}</span>
                    </div>
                    <Link
                      href={`/product/${product.id}`}
                      className="flex items-center space-x-1 font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      <span>Analyze</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Drops Feed (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800">
              Retail Price Drop Feed
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Live updates on gadget listings
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {insights.biggestDrops.map((p) => {
              const currentMin = p.bestDealPrice;
              const original = p.prices.length > 0 ? p.prices[0].originalPrice : p.bestDealPrice * 1.15;
              const dropAmt = p.dropAmount ?? (original - currentMin);
              return (
                <div key={p.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between space-x-4">
                  <div className="space-y-1 min-w-0">
                    <Link
                      href={`/product/${p.id}`}
                      className="text-xs font-bold text-slate-800 hover:text-blue-600 transition truncate block"
                    >
                      {p.name}
                    </Link>
                    <p className="text-[10px] text-slate-400">
                      Dropped to <span className="font-bold text-slate-600">₹{currentMin.toLocaleString('en-IN')}</span> on {p.bestDealStore}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-extrabold">
                      -₹{dropAmt.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Notifications Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-800 flex items-center space-x-1.5">
                <Bell size={16} className="text-slate-500" />
                <span>Recent Notifications</span>
              </h3>
              {notifications.length > 5 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {notifications.length} Total
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 5).map((notify) => {
                  const isUnread = !notify.read;
                  return (
                    <div 
                      key={notify.id} 
                      onClick={() => isUnread && markAsRead(notify.id)}
                      className={`py-3 flex items-start space-x-3 text-left first:pt-0 last:pb-0 transition duration-150 relative ${
                        isUnread ? 'cursor-pointer hover:bg-slate-50/50' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {notify.type === 'price_drop' && <ArrowDown size={14} className="text-red-500" />}
                        {notify.type === 'alert_triggered' && <AlertCircle size={14} className="text-green-500" />}
                        {notify.type === 'ai_recommendation' && <Sparkles size={14} className="text-purple-500 animate-pulse" />}
                        {notify.type === 'system' && <Info size={14} className="text-blue-500" />}
                        {!['price_drop', 'alert_triggered', 'ai_recommendation', 'system'].includes(notify.type) && <Info size={14} className="text-blue-500" />}
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-baseline">
                          <span className={`text-[11px] font-bold truncate ${
                            notify.type === 'price_drop' ? 'text-red-600' :
                            notify.type === 'alert_triggered' ? 'text-green-600 font-extrabold' :
                            notify.type === 'ai_recommendation' ? 'text-purple-600' :
                            'text-blue-600'
                          }`}>
                            {notify.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold flex-shrink-0 ml-1">
                            {new Date(notify.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-600 leading-relaxed font-semibold">
                          {notify.message}
                        </p>
                      </div>

                      {isUnread && (
                        <span className="absolute top-4 right-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
