'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Mail, Check, AlertCircle, Save, CheckSquare, Square } from 'lucide-react';

const retailersList = ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'];

export default function SettingsPage() {
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [preferredRetailers, setPreferredRetailers] = useState<string[]>(retailersList);
  const [alertFrequency, setAlertFrequency] = useState<'instant' | 'daily' | 'weekly'>('instant');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/user/settings');
        const result = await response.json();
        
        if (result.success && result.data) {
          setEmailAlertsEnabled(result.data.emailAlertsEnabled ?? true);
          setPreferredRetailers(result.data.preferredRetailers ?? retailersList);
          setAlertFrequency(result.data.alertFrequency ?? 'instant');
        } else {
          setError(result.error || 'Failed to load settings');
        }
      } catch (err) {
        setError('An unexpected error occurred while fetching your preferences.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleToggleRetailer = (retailer: string) => {
    setPreferredRetailers(prev => 
      prev.includes(retailer)
        ? prev.filter(r => r !== retailer)
        : [...prev, retailer]
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAlertsEnabled,
          preferredRetailers,
          alertFrequency
        })
      });
      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('An unexpected error occurred while saving your preferences.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">Notification Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Control when and how you receive alerts for price drops and target matches.
          </p>
        </div>

        {/* Form Container */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Status Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start space-x-3 text-green-700 animate-fade-in">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">Preferences saved successfully!</span>
              </div>
            )}

            {/* Section 1: General Notification Preferences */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-md font-bold text-slate-800 flex items-center mb-6">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Email Alerts
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <label htmlFor="email-alerts" className="text-sm font-bold text-slate-700">
                    Enable Email Notifications
                  </label>
                  <p className="text-xs text-slate-400">
                    Receive direct email alerts when a product on your watchlist reaches its target price.
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  id="email-alerts"
                  onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    emailAlertsEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Section 2: Preferred Retailers selection */}
            <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-opacity duration-200 ${
              emailAlertsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
            }`}>
              <h3 className="text-md font-bold text-slate-800 mb-2">Preferred Retailers</h3>
              <p className="text-xs text-slate-400 mb-6">
                Select the stores you prefer to receive deal alerts from. We will check all stores, but only email you for choices checked here.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {retailersList.map((retailer) => {
                  const isChecked = preferredRetailers.includes(retailer);
                  return (
                    <button
                      key={retailer}
                      type="button"
                      disabled={!emailAlertsEnabled}
                      onClick={() => handleToggleRetailer(retailer)}
                      className={`flex items-center space-x-3 p-4 rounded-2xl border text-left transition duration-200 ${
                        isChecked 
                          ? 'border-blue-200 bg-blue-50/20 text-blue-900 font-semibold' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-sm">{retailer}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Alert frequency settings */}
            <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-opacity duration-200 ${
              emailAlertsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
            }`}>
              <h3 className="text-md font-bold text-slate-800 mb-2">Alert Frequency Limits</h3>
              <p className="text-xs text-slate-400 mb-6">
                Limit how frequently DealSense AI sends alert updates to your inbox.
              </p>

              <div className="space-y-4">
                {[
                  { value: 'instant', label: 'Instant', description: 'Receive email alerts immediately when price targets are reached or drops are detected.' },
                  { value: 'daily', label: 'Daily Digest Limit', description: 'Send at most one email notification every 24 hours. Extra alerts are held back.' },
                  { value: 'weekly', label: 'Weekly Digest Limit', description: 'Send at most one email notification every 7 days. Inbox remains clutter-free.' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!emailAlertsEnabled}
                    onClick={() => setAlertFrequency(option.value as 'instant' | 'daily' | 'weekly')}
                    className={`w-full flex items-start space-x-3 p-4 rounded-2xl border text-left transition duration-200 ${
                      alertFrequency === option.value
                        ? 'border-blue-200 bg-blue-50/20 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="radio"
                        name="frequency"
                        checked={alertFrequency === option.value}
                        onChange={() => {}} // Controlled by button click
                        className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold">{option.label}</p>
                      <p className="text-xs text-slate-400 font-normal leading-relaxed">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
