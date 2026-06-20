'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockProducts } from '@/data/mockProducts';

export interface User {
  name: string;
  email: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  targetPrice: number;
  currentPriceAtSet: number;
  currentPrice?: number;
  isTriggered: boolean;
  status?: 'active' | 'triggered' | 'cancelled';
  storeName: string;
  createdAt?: string;
  triggeredAt?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  createdAt?: string | Date;
  isRead?: boolean;
  type: 'info' | 'success' | 'alert' | 'warning' | 'price_drop' | 'alert_triggered' | 'ai_recommendation' | 'system';
}

interface AppContextType {
  user: User | null;
  watchlist: string[]; // product IDs
  alerts: PriceAlert[];
  notifications: AppNotification[];
  isMounted: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addToWatchlist: (productId: string) => void;
  removeFromWatchlist: (productId: string) => void;
  isInWatchlist: (productId: string) => boolean;
  addAlert: (productId: string, targetPrice: number, storeName: string) => void;
  removeAlert: (alertId: string) => void;
  clearNotifications: () => void;
  addNotification: (title: string, message: string, type: AppNotification['type']) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const loadMockNotifications = useCallback(() => {
    const stored = localStorage.getItem('dealsense_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AppNotification[];
        const mapped = parsed.map((n: AppNotification) => ({
          ...n,
          timestamp: new Date(n.timestamp || n.createdAt || new Date()),
          isRead: n.isRead ?? n.read ?? false,
          read: n.read ?? n.isRead ?? false
        }));
        setNotifications(mapped);
      } catch (e) {
        console.error(e);
      }
    } else {
      const mockNotifs: AppNotification[] = [
        {
          id: 'notify-1',
          title: 'Welcome to DealSense AI!',
          message: 'Start tracking products and compare prices across top retail platforms.',
          timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
          read: false,
          isRead: false,
          type: 'system',
        },
        {
          id: 'notify-2',
          title: 'Price Drop Detected',
          message: 'Sony WH-1000XM5 headphones price dropped by ₹1,500 on Croma.',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          read: false,
          isRead: false,
          type: 'price_drop',
        }
      ];
      setNotifications(mockNotifs);
      localStorage.setItem('dealsense_notifications', JSON.stringify(mockNotifs));
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const resData = await res.json();
      if (resData.success && resData.data) {
        setUser({
          name: resData.data.name,
          email: resData.data.email,
        });
        return resData.data;
      }
    } catch (err) {
      console.error('Error verifying auth:', err);
    }
    setUser(null);
    return null;
  }, []);

  // Initialize and check Auth session
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth().finally(() => {
        setIsMounted(true);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  // Load user data when authenticated or changed
  useEffect(() => {
    if (!isMounted) return;
    const email = user?.email || 'demo@dealsense.ai';
    
    // 1. Fetch Watchlist
    fetch(`/api/watchlist?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          setWatchlist(resData.data.map((item: { id: string }) => item.id));
        } else {
          setWatchlist(user ? [] : ['iphone-15-pro', 'sony-wh-1000xm5']);
        }
      })
      .catch(err => {
        console.error('Error fetching watchlist:', err);
        setWatchlist(user ? [] : ['iphone-15-pro', 'sony-wh-1000xm5']);
      });

    // 2. Fetch Alerts
    fetch(`/api/alerts?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          const activeOrTriggered = resData.data.filter((a: PriceAlert) => a.status !== 'cancelled');
          setAlerts(activeOrTriggered);
        } else {
          setAlerts(user ? [] : [
            {
              id: 'alert-1',
              productId: 'iphone-15-pro',
              productName: 'Apple iPhone 15 Pro (128GB, Natural Titanium)',
              productImage: '/images/iphone15pro.png',
              targetPrice: 120000,
              currentPriceAtSet: 124900,
              isTriggered: false,
              storeName: 'Flipkart',
            }
          ]);
        }
      })
      .catch(err => console.error('Error fetching alerts:', err));

    // 3. Fetch Notifications
    fetch(`/api/notifications?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data && resData.data.length > 0) {
          const mapped = resData.data.map((n: AppNotification) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt || new Date()),
            read: n.isRead ?? false,
            type: n.type,
            createdAt: n.createdAt,
            isRead: n.isRead
          }));
          setNotifications(mapped);
        } else {
          loadMockNotifications();
        }
      })
      .catch(err => {
        console.error('Error fetching notifications:', err);
        loadMockNotifications();
      });
  }, [user, isMounted, loadMockNotifications]);

  // Notification Operations
  const addNotification = useCallback((title: string, message: string, type: AppNotification['type']) => {
    const email = user?.email || 'demo@dealsense.ai';
    const tempId = `notify-${Date.now()}`;
    const newNotify: AppNotification = {
      id: tempId,
      userId: email,
      title,
      message,
      timestamp: new Date(),
      read: false,
      type,
    };
    setNotifications((prev) => [newNotify, ...prev]);

    // LocalStorage fallback sync
    const stored = localStorage.getItem('dealsense_notifications');
    try {
      const notifs = stored ? JSON.parse(stored) : [];
      localStorage.setItem('dealsense_notifications', JSON.stringify([newNotify, ...notifs]));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('dealsense_notifications');
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true, isRead: true } : n))
    );

    // Call API
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationId })
    })
      .then(res => res.json())
      .catch(err => console.error('Error marking notification as read:', err));

    // Update LocalStorage fallback
    const stored = localStorage.getItem('dealsense_notifications');
    if (stored) {
      try {
        const notifs = JSON.parse(stored) as AppNotification[];
        const updated = notifs.map((n) => (n.id === notificationId ? { ...n, read: true, isRead: true } : n));
        localStorage.setItem('dealsense_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));

    // Call API
    const email = user?.email || 'demo@dealsense.ai';
    fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .catch(err => console.error('Error marking all notifications as read:', err));

    // Update LocalStorage fallback
    const stored = localStorage.getItem('dealsense_notifications');
    if (stored) {
      try {
        const notifs = JSON.parse(stored) as AppNotification[];
        const updated = notifs.map((n) => ({ ...n, read: true, isRead: true }));
        localStorage.setItem('dealsense_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  // Auth Operations
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        setUser({
          name: resData.data.name,
          email: resData.data.email
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        setUser({
          name: resData.data.name,
          email: resData.data.email
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setWatchlist([]);
      setAlerts([]);
      setNotifications([]);
    }
  }, []);

  // Watchlist Operations
  const addToWatchlist = useCallback((productId: string) => {
    const email = user?.email || 'demo@dealsense.ai';
    
    // Call POST API
    fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, productId })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setWatchlist((prev) => {
            if (!prev.includes(productId)) {
              return [...prev, productId];
            }
            return prev;
          });
          const product = mockProducts.find((p) => p.id === productId);
          if (product) {
            addNotification(
              'Added to Watchlist',
              `"${product.name}" was added to your watchlist.`,
              'success'
            );
          }
        }
      })
      .catch(err => console.error('Error adding to watchlist:', err));
  }, [user, addNotification]);

  const removeFromWatchlist = useCallback((productId: string) => {
    const email = user?.email || 'demo@dealsense.ai';
    
    // Call DELETE API
    fetch(`/api/watchlist?email=${encodeURIComponent(email)}&productId=${productId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setWatchlist((prev) => prev.filter((id) => id !== productId));
          const product = mockProducts.find((p) => p.id === productId);
          if (product) {
            addNotification(
              'Removed from Watchlist',
              `"${product.name}" was removed from your watchlist.`,
              'info'
            );
          }
        }
      })
      .catch(err => console.error('Error removing from watchlist:', err));
  }, [user, addNotification]);

  const isInWatchlist = useCallback((productId: string) => {
    return watchlist.includes(productId);
  }, [watchlist]);

  // Alert Operations
  const addAlert = useCallback((productId: string, targetPrice: number, storeName: string) => {
    const email = user?.email || 'demo@dealsense.ai';
    const tempId = `alert-${Date.now()}`;
    const product = mockProducts.find((p) => p.id === productId);

    // Call the POST endpoint
    fetch('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        productId,
        targetPrice,
        storeName
      })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          // Replace optimistic alert with real alert from API
          setAlerts(prev => [resData.data, ...prev.filter(a => a.id !== tempId)]);
        }
      })
      .catch(err => console.error('Error adding alert:', err));

    if (product) {
      const isTriggered = product.bestDealPrice <= targetPrice;
      const newAlert: PriceAlert = {
        id: tempId,
        productId,
        productName: product.name,
        productImage: product.image,
        targetPrice,
        currentPriceAtSet: product.bestDealPrice,
        currentPrice: product.bestDealPrice,
        isTriggered,
        storeName,
        status: isTriggered ? 'triggered' : 'active'
      };

      setAlerts((prev) => [newAlert, ...prev]);
      
      addNotification(
        'Alert Created',
        `We'll notify you when ${product.name} drops below ₹${targetPrice.toLocaleString('en-IN')} on ${storeName}.`,
        'info'
      );
    }
  }, [user, addNotification]);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));

    // Call DELETE API
    fetch(`/api/alerts?id=${alertId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          addNotification(
            'Alert Cancelled',
            'Your price alert has been successfully cancelled.',
            'info'
          );
        }
      })
      .catch(err => console.error('Error removing alert:', err));
  }, [addNotification]);

  return (
    <AppContext.Provider
      value={{
        user,
        watchlist,
        alerts,
        notifications,
        isMounted,
        login,
        signup,
        logout,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        addAlert,
        removeAlert,
        clearNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
