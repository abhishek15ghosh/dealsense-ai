'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Search, ChevronRight, Star, Trash2 } from 'lucide-react';
import { Product } from '@/data/mockProducts';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, user } = useApp();
  const [watchedProducts, setWatchedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const email = user?.email || 'demo@dealsense.ai';

    fetch(`/api/watchlist?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (active) {
          if (resData.success && resData.data) {
            setWatchedProducts(resData.data);
          } else {
            setWatchedProducts([]);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading watchlist products:', err);
        if (active) setWatchedProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, watchlist]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">
            Your Watchlist ({watchedProducts.length})
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Monitor real-time drops on items you are planning to purchase
          </p>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center text-slate-400 font-semibold space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading watchlist...</span>
          </div>
        ) : watchedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Heart size={20} />
            </div>
            <h3 className="font-display font-bold text-sm text-slate-700">Watchlist is Empty</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Explore gadgets and gadgets price comparison databases. Click &ldquo;Add to Watchlist&rdquo; on any product detail page.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/10"
            >
              <Search size={14} />
              <span>Search Products</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchedProducts.map((product) => {
              const original = product.prices?.[0]?.originalPrice || product.bestDealPrice;
              const current = product.bestDealPrice;
              const saving = original - current;
              const pct = original > 0 ? Math.round((saving / original) * 100) : 0;

              return (
                <div 
                  key={product.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-extrabold uppercase text-slate-400">
                        {product.category}
                      </span>
                      <div className="flex items-center space-x-0.5 text-amber-500 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        <Star size={10} className="fill-amber-500" />
                        <span>{product.rating}</span>
                      </div>
                    </div>

                    {/* Image and Title Row */}
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center flex-shrink-0">
                        <Image 
                          src={product.image} 
                          alt={product.name} 
                          width={64}
                          height={64}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      <Link 
                        href={`/product/${product.id}`}
                        className="font-display font-extrabold text-sm text-slate-800 hover:text-blue-600 transition line-clamp-2 leading-snug"
                      >
                        {product.name}
                      </Link>
                    </div>

                    {/* Pricing */}
                    <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Best Price</span>
                        <span className="font-display font-black text-base text-slate-800">
                          ₹{current.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Est. Savings</span>
                        <span className="text-xs text-green-600 font-bold">
                          ₹{saving.toLocaleString('en-IN')}{' '}
                          <span className="font-extrabold text-[10px]">(-{pct}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="border-t border-slate-100 pt-3 flex gap-2">
                    <button
                      onClick={() => removeFromWatchlist(product.id)}
                      className="p-2.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-500 transition-all duration-150"
                      title="Remove from watchlist"
                    >
                      <Trash2 size={14} />
                    </button>
                    <Link
                      href={`/product/${product.id}`}
                      className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition duration-150"
                    >
                      <span>Analyze Deals</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
