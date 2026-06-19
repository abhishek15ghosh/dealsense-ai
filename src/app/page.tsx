'use client';

import React from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Search, 
  Bell, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Star,
  Users
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Search,
      title: 'Unified Search',
      desc: 'Instantly scan Amazon, Flipkart, Croma, and Reliance Digital in a single query.'
    },
    {
      icon: Bell,
      title: 'Smart Drop Alerts',
      desc: 'Set your target price and we will notify you the second it dips below it.'
    },
    {
      icon: Cpu,
      title: 'AI Buy Recommendation',
      desc: 'Let our model evaluate historical trends and recommend whether to BUY, WAIT, or AVOID.'
    },
    {
      icon: TrendingUp,
      title: 'Historic Charts',
      desc: 'Verify retailers price manipulation by checking historical rates for up to 30 days.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <TrendingUp size={18} className="stroke-[2.5]" />
            </div>
            <span className="font-display font-bold text-xl text-slate-800 tracking-tight">
              DealSense AI
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
            <a href="#faq" className="hover:text-blue-600 transition">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-150"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-600">
            <span>✨ Introducing V1.0 - The Smartest Way to Shop</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Stop Overpaying. <br />
            Compare Prices with <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI Intelligence</span>
          </h1>

          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Scan top Indian e-commerce sites, verify historic price charts, and let AI analyze the absolute best moment to buy.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95 transition-all duration-150"
            >
              <span>Get Started Now</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-base font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-2xl active:scale-95 transition-all duration-150"
            >
              <span>View Demo Dashboard</span>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-slate-200/60 text-slate-400">
            <div className="flex items-center justify-center space-x-2">
              <Users size={18} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-600">12k+ Smart Shoppers</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle2 size={18} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-600">₹4.5M Saved Daily</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Star size={18} className="text-blue-500 fill-blue-500" />
              <span className="text-sm font-semibold text-slate-600">4.9 App Rating</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <ShieldCheck size={18} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-600">100% Secure Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-y border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Powerful Features for Pro Shoppers
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Equipped with deep analytics tools to bypass pricing traps and secure maximum discounts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-4 hover:shadow-lg hover:border-slate-300 transition duration-200">
                  <div className="p-3 bg-blue-600/10 rounded-xl text-blue-600 w-fit">
                    <Icon size={20} className="stroke-[2.5]" />
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-800">
                    {feat.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">
              Pricing Plans
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Start monitoring today for free, or upgrade for infinite alerts and AI recommendations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 max-w-3xl mx-auto gap-8">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base</span>
                <h3 className="text-2xl font-display font-extrabold text-slate-800">Standard</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-slate-900 font-display">₹0</span>
                  <span className="text-slate-500 text-sm font-medium ml-1">/ month</span>
                </div>
                <p className="text-slate-500 text-xs">Essential tracking for casual buyers.</p>
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  {['Track up to 3 products', 'Price comparison charts', 'Daily updates', 'Standard notifications'].map((feat) => (
                    <div key={feat} className="flex items-center space-x-2.5 text-xs text-slate-600">
                      <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/signup"
                className="w-full text-center font-semibold border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-xl transition text-sm block"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-widest uppercase">
                Popular
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Premium</span>
                <h3 className="text-2xl font-display font-extrabold text-white">DealSense Pro</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-white font-display">₹249</span>
                  <span className="text-slate-400 text-sm font-medium ml-1">/ month</span>
                </div>
                <p className="text-slate-400 text-xs">AI recommendations and unlimited tracking capacity.</p>
                <div className="border-t border-slate-800 pt-6 space-y-3">
                  {[
                    'Track unlimited products',
                    'Real-time price drop pushes',
                    'AI Buy/Wait prediction index',
                    'Multiple retailers dashboard support',
                    'Priority support channels'
                  ].map((feat) => (
                    <div key={feat} className="flex items-center space-x-2.5 text-xs text-slate-300">
                      <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/signup"
                className="w-full text-center font-semibold bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition text-sm block shadow-lg shadow-blue-500/20"
              >
                Get Started Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-800 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <TrendingUp size={16} className="stroke-[2.5]" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              DealSense AI
            </span>
          </div>
          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} DealSense AI. All rights reserved. MVP Demo.
          </span>
        </div>
      </footer>
    </div>
  );
}
