/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Globe
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface ProductSource {
  id: string;
  productId: string;
  productName: string;
  retailer: string;
  productUrl: string;
  lastPrice: number;
  lastChecked: string;
  status: 'Success' | 'Failed';
  active: boolean;
}

export default function AdminVerificationPage() {
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState('Amazon');
  const [productUrl, setProductUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Tracking scan action state
  const [scanning, setScanning] = useState(false);

  // Fetch sources and products
  const loadData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const sourcesRes = await fetch('/api/admin/verification');
      const sourcesData = await sourcesRes.json();
      if (sourcesData.success) {
        setSources(sourcesData.data);
      }

      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        if (productsData.data.length > 0) {
          setSelectedProductId(productsData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setErrorMessage('Failed to load page data. Check console logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !productUrl) {
      setErrorMessage('Please select a product and provide a valid URL.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          retailer: selectedRetailer,
          productUrl: productUrl,
          active: true
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Successfully linked source! Resolved Title: ${data.data.title}`);
        setProductUrl('');
        loadData();
      } else {
        setErrorMessage(data.error || 'Failed to link product source.');
      }
    } catch (err) {
      console.error('Error adding source:', err);
      setErrorMessage('Network error occurred while linking source.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product source?')) return;
    
    try {
      const res = await fetch(`/api/admin/verification?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSources(sources.filter(s => s.id !== id));
      } else {
        alert(data.error || 'Failed to delete source');
      }
    } catch (err) {
      console.error('Error deleting source:', err);
      alert('Network error occurred.');
    }
  };

  const handleToggleActive = async (source: ProductSource) => {
    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: source.productId,
          retailer: source.retailer,
          productUrl: source.productUrl,
          active: !source.active
        })
      });
      const data = await res.json();
      if (data.success) {
        setSources(sources.map(s => s.id === source.id ? { ...s, active: !s.active } : s));
      }
    } catch (err) {
      console.error('Error toggling active state:', err);
    }
  };

  const runPriceCheckNow = async () => {
    setScanning(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/system/run-price-check', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Price check completed! Metrics and history updated.');
        loadData();
      } else {
        setErrorMessage(data.error || 'Failed to run price check.');
      }
    } catch (err) {
      console.error('Error running manual price check:', err);
      setErrorMessage('Network error running price check.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">
              Retailer Price Integration & Verification
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Link products to real retailer URLs and check scraper crawler success or failures.
            </p>
          </div>
          <button
            onClick={runPriceCheckNow}
            disabled={scanning}
            className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Running Price Check...' : 'Run Price Check Now'}</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Link Retailer Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
              Link Retailer URL
            </h3>
            <form onSubmit={handleAddSource} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition"
                >
                  {products.length === 0 ? (
                    <option value="">No products found</option>
                  ) : (
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Retailer
                </label>
                <select
                  value={selectedRetailer}
                  onChange={(e) => setSelectedRetailer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="Amazon">Amazon India (Full Crawler)</option>
                  <option value="Flipkart">Flipkart India (Full Crawler)</option>
                  <option value="Croma">Croma (Full Crawler)</option>
                  <option value="Reliance Digital">Reliance Digital (Full Crawler)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Product Retailer URL
                </label>
                <input
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://www.amazon.in/dp/B0..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                  Use URLs containing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">mock-</code> (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">mock-iphone15</code>) for testing without hitting live Amazon servers.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || products.length === 0}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <Plus size={14} />
                <span>{submitting ? 'Linking...' : 'Link Source'}</span>
              </button>
            </form>
          </div>

          {/* Verification Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
              Linked Retailer Sources ({sources.length})
            </h3>
            
            {loading ? (
              <div className="flex h-64 items-center justify-center text-slate-400 text-xs font-semibold space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span>Loading sources...</span>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No linked retailer sources found. Add one on the left panel or check a watchlist item.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retailer</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Checked Price</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Active</th>
                      <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sources.map((source) => (
                      <tr key={source.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 pr-3 max-w-[200px]">
                          <div className="space-y-1">
                            <Link 
                              href={`/product/${source.productId}`}
                              className="font-display font-extrabold text-xs text-slate-800 hover:text-blue-600 transition block truncate"
                            >
                              {source.productName}
                            </Link>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {source.productId}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                            <Globe size={10} className="text-slate-400" />
                            <span>{source.retailer}</span>
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            <span className="font-display font-black text-xs text-slate-700">
                              ₹{source.lastPrice > 0 ? source.lastPrice.toLocaleString('en-IN') : 'N/A'}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {source.lastChecked ? new Date(source.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          {source.status === 'Success' ? (
                            <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                              <XCircle size={10} />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(source)}
                            className={`inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-pointer transition ${
                              source.active 
                                ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
                                : 'text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {source.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={source.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Open URL"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Link"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
