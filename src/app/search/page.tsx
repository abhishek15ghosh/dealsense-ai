'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { 
  Search as SearchIcon, 
  SlidersHorizontal, 
  Cpu, 
  Star, 
  ChevronRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getVerifiedBestDeal } from '@/lib/priceUtils';

interface SearchContentProps {
  queryParam: string;
}

interface ProductPrice {
  storeName: string;
  price: number;
  originalPrice: number;
  url: string;
  inStock: boolean;
  deliveryDays: number;
  status?: string;
  lastChecked?: string;
}

interface ProductPriceHistory {
  date: string;
  [key: string]: string | number | undefined;
}

interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewsCount: number;
  bestDealStore: string;
  bestDealPrice: number;
  prices: ProductPrice[];
  priceHistory: ProductPriceHistory[];
  aiRecommendation: {
    decision: 'BUY NOW' | 'WAIT' | 'AVOID' | 'BUY_NOW';
    confidence: number;
    reasoning: string[];
    summary: string;
  };
}

function SearchContent({ queryParam }: SearchContentProps) {
  const router = useRouter();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Local state filters
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStore, setSelectedStore] = useState('All');
  const [aiDecisionFilter, setAiDecisionFilter] = useState('All');

  // Categories list
  const categories = ['All', 'Smartphones', 'Laptops', 'Audio', 'Tablets'];
  // Retailers list
  const stores = [
    'All', 
    'Amazon', 
    'Flipkart', 
    'Croma', 
    'Reliance Digital',
    'Apple D2C',
    'Sony D2C',
    'Samsung D2C',
    'OnePlus D2C',
    'Dell D2C'
  ];
  // AI Decisions list
  const aiDecisions = ['All', 'STRONG BUY', 'BUY NOW', 'WAIT', 'STRONG WAIT', 'HIGH RISK'];

  // Fetch search results from API
  useEffect(() => {
    let active = true;
    
    const loadTimer = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    fetch(`/api/products/search?q=${encodeURIComponent(queryParam)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.statusText}`);
        }
        return res.json();
      })
      .then((resData) => {
        if (!active) return;
        if (resData.success && resData.data) {
          setProducts(resData.data);
          setError(null);
        } else {
          setError(resData.error || 'Failed to fetch search results.');
        }
      })
      .catch((err) => {
        console.error('Error fetching search results:', err);
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Network error or server unavailable.');
      })
      .finally(() => {
        clearTimeout(loadTimer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(loadTimer);
    };
  }, [queryParam, retryCount]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  // Derived state: calculate filtered products on each render
  let filteredProducts: Product[] = [];

  if (!loading && !error) {
    filteredProducts = products;

    // Filter by category
    if (selectedCategory !== 'All') {
      filteredProducts = filteredProducts.filter((p) => p.category === selectedCategory);
    }

    // Filter by store presence
    if (selectedStore !== 'All') {
      filteredProducts = filteredProducts.filter((p) =>
        p.prices && Array.isArray(p.prices) && p.prices.some((sp) => sp.storeName === selectedStore && sp.inStock)
      );
    }

    // Filter by AI recommendation decision
    if (aiDecisionFilter !== 'All') {
      filteredProducts = filteredProducts.filter((p) => {
        if (!p.aiRecommendation?.decision) return false;
        return p.aiRecommendation.decision.toUpperCase().replace('_', ' ') === aiDecisionFilter.toUpperCase().replace('_', ' ');
      });
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const getRecommendationBadge = (decision: Product['aiRecommendation']['decision']) => {
    const d = String(decision || '').toUpperCase().replace('_', ' ');
    switch (d) {
      case 'STRONG BUY':
        return 'bg-blue-50 text-blue-700 border-blue-100 font-extrabold';
      case 'BUY NOW':
        return 'bg-green-50 text-green-700 border-green-100 font-bold';
      case 'WAIT':
        return 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
      case 'STRONG WAIT':
        return 'bg-orange-50 text-orange-700 border-orange-100 font-bold';
      case 'HIGH RISK':
      case 'AVOID':
        return 'bg-red-50 text-red-700 border-red-100 font-bold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtering Header and Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-150"
          >
            Go
          </button>
        </form>

        <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold">
          <SlidersHorizontal size={14} />
          <span>Filters Active: {!loading && !error ? filteredProducts.length : 0} Items found</span>
        </div>
      </div>

      {/* Grid split: Filter Sidebar + Search Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Filters Sidebar Pane (3 Columns) */}
        <div className="lg:col-span-3 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
            Search Filters
          </h3>

          {/* Category Filter */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Category
            </span>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Store Availability Filter */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Store Available
            </span>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {stores.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStore(st)}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    selectedStore === st
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* AI Recommendation Filter */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              AI Recommendation
            </span>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {aiDecisions.map((dec) => (
                <button
                  key={dec}
                  onClick={() => setAiDecisionFilter(dec)}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    aiDecisionFilter === dec
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {dec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results list Pane (9 Columns) */}
        <div className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-24 text-center flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-400 text-xs font-semibold">Aggregating live price details...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 p-24 text-center flex flex-col items-center justify-center space-y-4">
              <div className="text-red-500 font-extrabold text-sm mb-2">Error Occurred</div>
              <p className="text-slate-500 text-xs">{error}</p>
              <button
                onClick={handleRetry}
                className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition shadow-md shadow-red-500/10 hover:shadow-red-500/20"
              >
                Retry Search
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <p className="text-slate-400 text-sm font-semibold">
                No products match your search or filter requirements.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedStore('All');
                  setAiDecisionFilter('All');
                }}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProducts.map((product) => {
                const deal = getVerifiedBestDeal(product.prices.map(sp => ({
                  storeName: sp.storeName,
                  price: sp.price,
                  originalPrice: sp.originalPrice,
                  url: sp.url,
                  inStock: sp.inStock,
                  status: sp.status || (sp.inStock ? 'Success' : 'Failed'),
                  lastChecked: sp.lastChecked || new Date().toISOString()
                })));
                const savingsPct = deal.savingsPct;
                const currentBestPrice = deal.bestPrice;
                const bestDealStore = deal.bestStore;
                const isBestPriceAvailable = deal.hasDeal;
                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Upper content */}
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 border rounded-lg text-[9px] font-extrabold ${getRecommendationBadge(product.aiRecommendation.decision)}`}>
                          <Cpu size={10} />
                          <span>AI: {product.aiRecommendation.decision.replace('_', ' ')}</span>
                        </span>
                        
                        <div className="flex items-center space-x-1 text-amber-500 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          <Star size={12} className="fill-amber-500" />
                          <span>{product.rating}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5">
                        <Link 
                          href={`/product/${product.id}`}
                          className="font-display font-extrabold text-base text-slate-800 hover:text-blue-600 line-clamp-2 transition duration-150"
                        >
                          {product.name}
                        </Link>
                        <p className="text-slate-400 text-xs line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      {/* Pricing list row */}
                      <div className="border-y border-slate-100 py-3 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-semibold text-slate-600">
                        {product.prices.slice(0, 4).map((sp) => (
                          <div key={sp.storeName} className="flex justify-between items-center">
                            <span className="text-slate-400 truncate max-w-[80px]">{sp.storeName}:</span>
                            <span className={sp.storeName === bestDealStore ? 'text-blue-600 font-extrabold' : ''}>
                              {sp.price !== undefined && sp.price !== null && sp.price > 0 && sp.status !== 'Failed' ? `₹${sp.price.toLocaleString('en-IN')}` : 'Price unavailable'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer bar */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold gap-3 flex-wrap">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Best Deal</span>
                        <p className="text-slate-700">
                          {isBestPriceAvailable ? (
                            <>
                              ₹{currentBestPrice.toLocaleString('en-IN')}{' '}
                              <span className="text-green-600 text-[10px]">(-{savingsPct}%)</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Best deal unavailable</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isInWatchlist(product.id) ? (
                          <button
                            onClick={() => removeFromWatchlist(product.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2.5 rounded-xl text-xs transition duration-150 border border-red-200"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => addToWatchlist(product.id)}
                            className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs transition duration-150 border border-slate-200"
                          >
                            Add to Watchlist
                          </button>
                        )}
                        <Link
                          href={`/product/${product.id}`}
                          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl text-xs transition duration-150 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
                        >
                          <span>View Deal</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchContentWrapper() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  return <SearchContent key={queryParam} queryParam={queryParam} />;
}

export default function SearchPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex h-64 items-center justify-center text-slate-400 font-semibold">
          Loading Search...
        </div>
      }>
        <SearchContentWrapper />
      </Suspense>
    </DashboardLayout>
  );
}
