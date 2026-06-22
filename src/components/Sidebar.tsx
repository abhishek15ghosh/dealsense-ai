'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Search, 
  Heart, 
  Bell, 
  LogOut, 
  TrendingUp, 
  User as UserIcon,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Product Search', href: '/search', icon: Search },
    { name: 'Watchlist', href: '/watchlist', icon: Heart },
    { name: 'Price Alerts', href: '/alerts', icon: Bell },
    { name: 'Admin Verification', href: '/admin/verification', icon: UserIcon },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 w-64 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
        <Link href="/" className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <TrendingUp size={20} className="stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            DealSense AI
          </span>
        </Link>
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3 px-2 py-2">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-xs text-slate-400 hover:text-red-400 transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay */}
          <div 
            onClick={onClose} 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          />
          {/* Menu Drawer */}
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
