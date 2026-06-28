'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { mockProducts, PriceHistoryPoint } from '@/data/mockProducts';
import DashboardLayout from '@/components/DashboardLayout';
import PriceChart from '@/components/PriceChart';
import Image from 'next/image';
import { 
  Heart, 
  Bell, 
  ExternalLink, 
  Star, 
  Cpu, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProductPrice {
  storeName: string;
  price: number;
  originalPrice: number;
  url: string;
  inStock: boolean;
  deliveryDays: number;
}

interface ProductPriceHistory {
  date: string;
  [key: string]: number | string | undefined;
}

interface ProductType {
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
  prices: ProductPrice[];
  priceHistory: ProductPriceHistory[];
  aiRecommendation: {
    decision: 'STRONG BUY' | 'BUY NOW' | 'WAIT' | 'STRONG WAIT' | 'HIGH RISK' | 'STRONG_BUY' | 'BUY_NOW' | 'STRONG_WAIT' | 'HIGH_RISK' | 'AVOID';
    confidence: number;
    reasoning: string[];
    summary: string;
    expectedBetterPriceRange?: string;
    bestPlatform?: string;
    estimatedSavings?: number;
    bestExpectedPurchaseDate?: string;
  };
  aiPricePrediction?: {
    nextPredictedDropDate?: string;
    predictedDropAmount: number;
    confidenceScore: number;
    forecast: Array<{ date: string; price: number }>;
    analysis: string;
  };
}

export default function ProductDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const { 
    addToWatchlist, 
    removeFromWatchlist, 
    isInWatchlist, 
    addAlert,
    alerts
  } = useApp();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);

  // Price Alert Form State
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [alertStore, setAlertStore] = useState<string>('Amazon');
  const [alertSuccess, setAlertSuccess] = useState(false);

  const isValidUrl = (url?: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.startsWith('http') && !lowerUrl.includes('mock');
  };

  useEffect(() => {
    let active = true;
    
    // Set loading asynchronously to avoid synchronous render warning
    const loadTimer = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((resData) => {
        if (!active) return;
        if (resData.success && resData.data) {
          setProduct(resData.data);
          if (resData.data.prices && resData.data.prices.length > 0) {
            setAlertStore(resData.data.prices[0].storeName);
          }
        } else {
          // Fallback to static mock products
          const fallback = mockProducts.find((p) => p.id === id);
          if (fallback) setProduct(fallback as unknown as ProductType);
        }
      })
      .catch((err) => {
        console.error('Error fetching product details:', err);
        if (!active) return;
        const fallback = mockProducts.find((p) => p.id === id);
        if (fallback) setProduct(fallback as unknown as ProductType);
      })
      .finally(() => {
        clearTimeout(loadTimer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(loadTimer);
    };
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center text-slate-400 font-semibold space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading product analysis...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-700">Product Not Found</h2>
          <p className="text-slate-500 text-sm">
            The requested product ID &ldquo;{id}&rdquo; could not be retrieved from the database.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isWatched = isInWatchlist(product.id);
  const activeAlert = alerts.find(a => a.productId === product.id && !a.isTriggered);

  const handleWatchlistToggle = () => {
    if (isWatched) {
      removeFromWatchlist(product.id);
    } else {
      addToWatchlist(product.id);
    }
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;
    
    addAlert(product.id, priceNum, alertStore);
    setAlertSuccess(true);
    setTargetPrice('');
    
    setTimeout(() => {
      setAlertSuccess(false);
    }, 4000);
  };

  // Helper styles for AI decisions
  const getAiCardColor = (decision: string) => {
    const d = String(decision || '').toUpperCase().replace('_', ' ');
    switch (d) {
      case 'STRONG BUY':
        return {
          bg: 'bg-blue-50/70 border-blue-200/80',
          text: 'text-blue-800',
          badge: 'bg-blue-600 text-white font-extrabold',
          iconColor: 'text-blue-600',
          progress: 'bg-blue-600'
        };
      case 'BUY NOW':
        return {
          bg: 'bg-green-50/70 border-green-200/80',
          text: 'text-green-800',
          badge: 'bg-green-500 text-white font-extrabold',
          iconColor: 'text-green-600',
          progress: 'bg-green-600'
        };
      case 'WAIT':
        return {
          bg: 'bg-amber-50/70 border-amber-200/80',
          text: 'text-amber-800',
          badge: 'bg-amber-500 text-white font-extrabold',
          iconColor: 'text-amber-600',
          progress: 'bg-amber-600'
        };
      case 'STRONG WAIT':
        return {
          bg: 'bg-orange-50/70 border-orange-200/80',
          text: 'text-orange-800',
          badge: 'bg-orange-500 text-white font-extrabold',
          iconColor: 'text-orange-600',
          progress: 'bg-orange-600'
        };
      case 'HIGH RISK':
      case 'AVOID':
        return {
          bg: 'bg-red-50/70 border-red-200/80',
          text: 'text-red-800',
          badge: 'bg-red-500 text-white font-extrabold',
          iconColor: 'text-red-600',
          progress: 'bg-red-600'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200/80',
          text: 'text-slate-800',
          badge: 'bg-slate-500 text-white font-extrabold',
          iconColor: 'text-slate-600',
          progress: 'bg-slate-600'
        };
    }
  };

  const aiStyles = getAiCardColor(product.aiRecommendation.decision);
  const originalPrice = product.prices.length > 0 ? product.prices[0].originalPrice : product.bestDealPrice;
  const currentBestPrice = product.bestDealPrice;
  const savingAmount = originalPrice - currentBestPrice;
  const savingPct = originalPrice > 0 ? Math.round((savingAmount / originalPrice) * 100) : 0;

  // Adapt dynamic charts data by cleaning undefined platforms
  const formattedChartData = product.priceHistory.map((h) => {
    const cleaned: Record<string, string | number> = { date: h.date };
    Object.keys(h).forEach((key) => {
      if (key !== 'date' && h[key] !== undefined) {
        cleaned[key] = h[key] as number;
      }
    });
    return cleaned;
  });

  return (
    <DashboardLayout>
      {/* Back button */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {/* Main product panel (Split Image & Details/AI Recommendation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Product Image Gallery (5 Columns) */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <Image
              src={product.image}
              alt={product.name}
              width={320}
              height={320}
              className="object-contain max-h-full max-w-full hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="w-full flex gap-3">
            <button
              onClick={handleWatchlistToggle}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl border text-xs font-bold transition-all duration-200 ${
                isWatched
                  ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Heart size={16} className={isWatched ? 'fill-blue-600 text-blue-600' : ''} />
              <span>{isWatched ? 'Watched' : 'Watchlist'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Title + AI Recommendation Card (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Info */}
          <div className="space-y-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {product.category}
              </span>
              <div className="flex items-center space-x-1.5 text-amber-500 font-bold text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                <Star size={14} className="fill-amber-500" />
                <span>{product.rating} ({product.reviewsCount} reviews)</span>
              </div>
            </div>

            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-800 leading-tight">
              {product.name}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              {product.description}
            </p>

            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block w-full">Best Current Retail Value</span>
              <span className="text-3xl font-black text-slate-800 font-display">
                ₹{currentBestPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-slate-400 line-through text-sm">
                MSRP ₹{originalPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-0.5 rounded-lg border border-green-100/60">
                Saved ₹{savingAmount.toLocaleString('en-IN')} ({savingPct}%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 mt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Lowest Recorded</span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  ₹{(product.lowestRecordedPrice || product.bestDealPrice).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Highest Recorded</span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  ₹{(product.highestRecordedPrice || Math.round(product.bestDealPrice * 1.15)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Price Trend</span>
                <span className={`inline-flex items-center self-start px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                  product.priceTrend === 'down' ? 'bg-green-50 text-green-700 border-green-200' :
                  product.priceTrend === 'up' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {(product.priceTrend || 'stable').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* AI Recommendation Box */}
          <div className={`border p-6 rounded-3xl space-y-4 shadow-sm transition ${aiStyles.bg}`}>
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className={aiStyles.iconColor} size={20} />
                <span className="font-display font-bold text-sm text-slate-800">
                  AI Deal Intelligence
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${aiStyles.badge}`}>
                {product.aiRecommendation.decision.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Confidence Gauge */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center space-y-1">
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-slate-200">
                  <div className="absolute font-display font-black text-lg text-slate-800">
                    {product.aiRecommendation.confidence}%
                  </div>
                  {/* Gauge Arc */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="44"
                      cy="44"
                      r="36"
                      stroke="url(#blue-grad)"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="226"
                      strokeDashoffset={226 - (226 * product.aiRecommendation.confidence) / 100}
                      className="translate-x-1 translate-y-1"
                    />
                  </svg>
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pt-1">
                  Confidence Score
                </span>
              </div>

              {/* Recommendation summary */}
              <div className="sm:col-span-8 space-y-2">
                <p className="text-xs font-semibold text-slate-700 leading-relaxed italic">
                  &ldquo;{product.aiRecommendation.summary}&rdquo;
                </p>
                <div className="space-y-1.5 pt-1">
                  {product.aiRecommendation.reasoning.map((reason: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2 text-[11px] text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <p>{reason}</p>
                    </div>
                  ))}
                </div>

                {/* Expected Price Range, Best Platform, Savings & Expected Date */}
                <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-200/50 text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  {product.aiRecommendation.expectedBetterPriceRange && (
                    <div className="bg-white/50 p-2.5 rounded-xl border border-slate-200/20">
                      <span className="text-slate-400 block text-[8px]">Projected price range</span>
                      <span className="text-slate-700 text-xs font-black">{product.aiRecommendation.expectedBetterPriceRange}</span>
                    </div>
                  )}
                  {product.aiRecommendation.bestPlatform && (
                    <div className="bg-white/50 p-2.5 rounded-xl border border-slate-200/20">
                      <span className="text-slate-400 block text-[8px]">Best Store Platform</span>
                      <span className="text-slate-700 text-xs font-black">{product.aiRecommendation.bestPlatform}</span>
                    </div>
                  )}
                  {product.aiRecommendation.estimatedSavings !== undefined && (
                    <div className="bg-white/50 p-2.5 rounded-xl border border-slate-200/20">
                      <span className="text-slate-400 block text-[8px]">Estimated Savings</span>
                      <span className="text-green-600 text-xs font-black">₹{product.aiRecommendation.estimatedSavings.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {product.aiRecommendation.bestExpectedPurchaseDate && (
                    <div className="bg-white/50 p-2.5 rounded-xl border border-slate-200/20">
                      <span className="text-slate-400 block text-[8px]">Best Purchase Date</span>
                      <span className="text-slate-700 text-xs font-black">{product.aiRecommendation.bestExpectedPurchaseDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Price Prediction Card */}
          {product.aiPricePrediction && (
            <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/20 border border-indigo-100 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-indigo-100/50 pb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="font-display font-bold text-sm text-slate-800">
                  AI Price Forecasting Model
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50/60 flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Next Predicted Drop</span>
                  <span className="text-sm font-black text-indigo-700 font-display mt-1">
                    {product.aiPricePrediction.nextPredictedDropDate || 'N/A'}
                  </span>
                </div>
                <div className="bg-white/80 p-4 rounded-2xl border border-indigo-50/60 flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Projected Savings</span>
                  <span className="text-sm font-black text-green-600 font-display mt-1">
                    {product.aiPricePrediction.predictedDropAmount > 0 
                      ? `₹${product.aiPricePrediction.predictedDropAmount.toLocaleString('en-IN')}`
                      : '₹0'
                    }
                  </span>
                </div>
              </div>

              {product.aiPricePrediction.analysis && (
                <div className="text-xs text-slate-600 leading-relaxed border-t border-indigo-50/50 pt-3">
                  <p className="font-semibold text-slate-800 mb-1">Pricing Trajectory Analysis:</p>
                  <p className="italic text-slate-500">&ldquo;{product.aiPricePrediction.analysis}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Comparison Grid & Alert Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Price Comparison Matrix Table (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800">
              Live Store Price Matrix
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Current listing details across Indian retail portals
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Store</th>
                  <th className="pb-3 font-semibold text-right">Price</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-center">Shipping</th>
                  <th className="pb-3 font-semibold text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {product.prices.map((storePrice: ProductPrice) => {
                  const isBest = storePrice.storeName === product.bestDealStore;
                  return (
                    <tr key={storePrice.storeName} className={`hover:bg-slate-50 transition duration-150 ${isBest ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-4 font-bold flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                          storePrice.storeName === 'Amazon' ? 'bg-[#FF9900]' :
                          storePrice.storeName === 'Flipkart' ? 'bg-[#2874F0]' :
                          storePrice.storeName === 'Croma' ? 'bg-[#008080]' :
                          storePrice.storeName === 'Reliance Digital' ? 'bg-[#E4252A]' :
                          'bg-[#3b82f6]'
                        }`} />
                        <span>{storePrice.storeName}</span>
                        {isBest && (
                          <span className="inline-block px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                            Best Deal
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-black text-slate-800">
                        ₹{storePrice.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          storePrice.inStock
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {storePrice.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 text-center text-slate-400">
                        {storePrice.inStock ? `${storePrice.deliveryDays} Day Delivery` : '--'}
                      </td>
                      <td className="py-4 text-right">
                        {isValidUrl(storePrice.url) ? (
                          <a
                            href={storePrice.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-bold"
                          >
                            <span>Visit Store</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Custom Price Alerts Creator Form (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800">
              Create Smart Alert
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Get an instant notification when prices match your budget
            </p>
          </div>

          {activeAlert ? (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs space-y-2">
              <div className="flex items-center space-x-2 text-blue-700 font-bold">
                <CheckCircle2 size={16} />
                <span>Monitoring Active</span>
              </div>
              <p className="text-slate-600">
                You&apos;ve configured an active alert for target price{' '}
                <span className="font-bold text-slate-800">₹{activeAlert.targetPrice.toLocaleString('en-IN')}</span>{' '}
                on {activeAlert.storeName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAlert} className="space-y-4">
              {alertSuccess && (
                <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-xs font-semibold">
                  🎯 Alert successfully registered!
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500" htmlFor="target-price">
                  Target Price Alert (INR)
                </label>
                <input
                  id="target-price"
                  type="number"
                  placeholder={`e.g. ${Math.round(product.bestDealPrice * 0.95)}`}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500" htmlFor="store-filter">
                  Retailer Platform
                </label>
                <select
                  id="store-filter"
                  value={alertStore}
                  onChange={(e) => setAlertStore(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition"
                >
                  {product.prices.map((sp: ProductPrice) => (
                    <option key={sp.storeName} value={sp.storeName}>
                      {sp.storeName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition duration-150"
              >
                <Bell size={14} />
                <span>Activate Tracker</span>
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Price History Area Chart */}
      <PriceChart 
        data={formattedChartData as unknown as PriceHistoryPoint[]} 
        forecast={product.aiPricePrediction?.forecast}
      />

      {/* SVG Linear Gradient for Gauge Ring */}
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dynamic Success Toast Alert */}
      {alertSuccess && (
        <div className="fixed bottom-6 right-6 bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-slate-800 z-50 transition-all duration-300 transform scale-100 translate-y-0">
          <CheckCircle2 className="text-green-400" size={16} />
          <span>Price alert tracker activated successfully!</span>
        </div>
      )}
    </DashboardLayout>
  );
}
