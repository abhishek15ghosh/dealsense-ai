'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp, AppNotification } from '@/context/AppContext';
import { 
  Bell, 
  Menu, 
  Trash2, 
  ArrowDown, 
  AlertCircle, 
  Sparkles, 
  Info,
  CheckCheck
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, clearNotifications, markAsRead, markAllAsRead, alerts } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNotificationClick = (notify: AppNotification) => {
    if (!notify.read) {
      markAsRead(notify.id);
    }
    setShowNotifications(false);
    if (notify.productId) {
      router.push(`/product/${notify.productId}`);
    } else if (notify.type === 'alert_triggered') {
      router.push('/alerts');
    }
  };

  // Get Page Title from Pathname
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/search')) return 'Search Deals';
    if (pathname.includes('/product/')) return 'Product Intelligence';
    if (pathname.includes('/watchlist')) return 'Watchlist Monitor';
    if (pathname.includes('/alerts')) return 'Smart Alerts';
    if (pathname.includes('/settings')) return 'User Settings';
    return 'DealSense AI';
  };

  const unreadCount = alerts.filter(a => a.read === false).length;
  console.log('[HEADER DEBUG] unreadCount of alerts:', unreadCount, 'alerts:', alerts);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_drop':
        return <ArrowDown size={14} className="text-red-500" />;
      case 'alert_triggered':
        return <AlertCircle size={14} className="text-green-500" />;
      case 'ai_recommendation':
        return <Sparkles size={14} className="text-purple-500 animate-pulse" />;
      case 'system':
      default:
        return <Info size={14} className="text-blue-500" />;
    }
  };

  const getNotificationTitleColor = (type: string) => {
    switch (type) {
      case 'price_drop':
        return 'text-red-600';
      case 'alert_triggered':
        return 'text-green-600 font-extrabold';
      case 'ai_recommendation':
        return 'text-purple-600';
      case 'system':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center space-x-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden transition"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl font-display font-semibold tracking-tight text-slate-800">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications Dropdown Container */}
        <div className="relative" style={{ overflow: 'visible' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all duration-200"
          >
            <Bell size={20} />
          </button>
          {unreadCount > 0 && (
            <span 
              className="absolute bg-red-600 text-white font-bold rounded-full flex items-center justify-center text-[9px] pointer-events-none ring-2 ring-white"
              style={{
                top: '-6px',
                right: '-6px',
                width: '18px',
                height: '18px',
                minWidth: '18px',
                zIndex: 9999
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {showNotifications && (
            <>
              {/* Click outside backdrop overlay */}
              <div 
                onClick={() => setShowNotifications(false)} 
                className="fixed inset-0 z-40"
              />
              
              {/* Notification Box */}
              <div className="absolute right-0 mt-2 w-80 max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 z-50 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="font-display font-bold text-sm text-slate-700">Notifications</span>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="flex items-center space-x-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold transition"
                        title="Mark all as read"
                      >
                        <CheckCheck size={12} />
                        <span>Mark all as read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          clearNotifications();
                          setShowNotifications(false);
                        }}
                        className="flex items-center space-x-1 text-[10px] text-red-500 hover:text-red-600 transition font-bold"
                        title="Clear all notifications"
                      >
                        <Trash2 size={11} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notify) => (
                      <div 
                        key={notify.id} 
                        onClick={() => handleNotificationClick(notify)}
                        className={`p-4 transition duration-150 relative flex items-start space-x-3 text-left cursor-pointer ${
                          !notify.read 
                            ? 'bg-blue-50/10 hover:bg-blue-50/20' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getNotificationIcon(notify.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex justify-between items-baseline">
                            <span className={`font-bold text-xs truncate ${getNotificationTitleColor(notify.type)}`}>
                              {notify.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium flex-shrink-0 ml-1">
                              {new Date(notify.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed font-semibold">
                            {notify.message}
                          </p>
                        </div>

                        {!notify.read && (
                          <span className="absolute top-4 right-3 h-1.5 w-1.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
