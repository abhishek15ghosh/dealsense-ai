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
  Globe,
  FileText,
  Database,
  Mail,
  Clock,
  Check
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

interface Metrics {
  dbLatencyMs: number;
  sources: {
    total: number;
    active: number;
    success: number;
    failed: number;
  };
}

interface CronLog {
  _id: string;
  startedAt: string;
  durationMs: number;
  status: string;
  alertsChecked: number;
  alertsTriggered: number;
}

interface ErrorLogItem {
  _id: string;
  severity: string;
  component: string;
  errorName: string;
  errorMessage: string;
  timestamp: string;
}

interface FailedAlert {
  _id: string;
  userEmail: string;
  productName: string;
  storeName?: string;
  platform?: string;
  emailError: string;
}

export default function AdminVerificationPage() {
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'sources' | 'monitoring' | 'errors'>('sources');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogItem[]>([]);
  const [failedAlerts, setFailedAlerts] = useState<FailedAlert[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState('Amazon');
  const [productUrl, setProductUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Tracking scan action state
  const [scanning, setScanning] = useState(false);

  // Fetch logs and system health status from API
  const loadLogsData = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch('/api/admin/logs');
      const resData = await res.json();
      if (resData.success) {
        setMetrics(resData.data.metrics);
        setCronLogs(resData.data.cronLogs);
        setErrorLogs(resData.data.errorLogs);
        setFailedAlerts(resData.data.failedAlerts);
      }
    } catch (err) {
      console.error('Error fetching logs data:', err);
      setErrorMessage('Failed to load system logs and health status.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleResolveError = async (id: string) => {
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setErrorLogs(errorLogs.filter(err => err._id !== id));
        setSuccessMessage('Successfully marked error as resolved.');
        loadLogsData();
      } else {
        setErrorMessage(data.error || 'Failed to resolve error log.');
      }
    } catch (err) {
      console.error('Error resolving error log:', err);
      setErrorMessage('Network error resolving error log.');
    }
  };

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
    setErrorMessage('');
    setSuccessMessage('');
    if (activeTab === 'sources') {
      loadData(true);
    } else {
      loadLogsData();
    }
  }, [activeTab]);

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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('sources')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
              activeTab === 'sources'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Product Sources
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
              activeTab === 'monitoring'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Monitoring & Status
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
              activeTab === 'errors'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            System Error Logs
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

        {activeTab === 'sources' && (
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
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
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
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition animate-none cursor-pointer"
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
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Health & Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Database size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DB Latency</span>
                  <span className="font-display font-black text-lg text-slate-800">
                    {metrics ? `${metrics.dbLatencyMs} ms` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Errors</span>
                  <span className="font-display font-black text-lg text-slate-800">
                    {errorLogs.length}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Globe size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sources Success</span>
                  <span className="font-display font-black text-lg text-slate-800">
                    {metrics ? `${metrics.sources.success} / ${metrics.sources.active}` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Mail size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failed Alerts</span>
                  <span className="font-display font-black text-lg text-slate-800">
                    {failedAlerts.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Cron Runs & Delivery Failures Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Cron Run Logs */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Clock size={16} className="text-slate-500" />
                  <span>Recent Cron Executions ({cronLogs.length})</span>
                </h3>
                {logsLoading ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Loading cron history...</div>
                ) : cronLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No execution history recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 font-bold text-slate-400">
                          <th className="pb-2">Time</th>
                          <th className="pb-2">Duration</th>
                          <th className="pb-2 text-center">Status</th>
                          <th className="pb-2 text-right">Stats (Ch/Tr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cronLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 text-slate-600">
                              {new Date(log.startedAt).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2.5 font-mono text-slate-500">{log.durationMs}ms</td>
                            <td className="py-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                log.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                              {log.alertsChecked} checked / {log.alertsTriggered} trig
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Email Delivery Failures */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Mail size={16} className="text-slate-500" />
                  <span>Failed Alert Dispatches ({failedAlerts.length})</span>
                </h3>
                {logsLoading ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Loading alert states...</div>
                ) : failedAlerts.length === 0 ? (
                  <div className="text-center py-12 text-emerald-500 text-xs font-semibold">All triggered email alerts dispatched successfully! 🎉</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 font-bold text-slate-400">
                          <th className="pb-2">Target User</th>
                          <th className="pb-2">Product</th>
                          <th className="pb-2">Store</th>
                          <th className="pb-2 text-right">Error Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {failedAlerts.map((alert) => (
                          <tr key={alert._id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 font-semibold text-slate-700 max-w-[120px] truncate" title={alert.userEmail}>
                              {alert.userEmail}
                            </td>
                            <td className="py-2.5 text-slate-600 truncate max-w-[120px]" title={alert.productName}>
                              {alert.productName}
                            </td>
                            <td className="py-2.5 text-slate-500 font-bold">{alert.storeName || alert.platform}</td>
                            <td className="py-2.5 text-right text-red-600 font-mono text-[10px] max-w-[150px] truncate" title={alert.emailError}>
                              {alert.emailError || 'Failed'}
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
        )}

        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center space-x-2">
                <FileText size={16} className="text-slate-500" />
                <span>Active Production Exceptions ({errorLogs.length})</span>
              </h3>
              {logsLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs">Loading error reports...</div>
              ) : errorLogs.length === 0 ? (
                <div className="text-center py-12 text-emerald-500 text-xs font-semibold">Zero unresolved system errors. System stable! 💎</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold text-slate-400 font-display">
                        <th className="pb-2">Severity</th>
                        <th className="pb-2">Component</th>
                        <th className="pb-2">Error Msg</th>
                        <th className="pb-2">Timestamp</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {errorLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              log.severity === 'CRITICAL' ? 'text-red-700 bg-red-100' : log.severity === 'WARNING' ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-100'
                            }`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-700 font-mono text-[10px]">{log.component}</td>
                          <td className="py-3 text-slate-600 max-w-sm truncate" title={log.errorMessage}>
                            <span className="font-bold text-slate-800">{log.errorName}: </span>
                            {log.errorMessage}
                          </td>
                          <td className="py-3 text-slate-400 text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleResolveError(log._id)}
                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-100 hover:border-blue-600 px-2 py-1 rounded-lg cursor-pointer transition"
                            >
                              <Check size={10} />
                              <span>Resolve</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
