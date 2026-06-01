/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BookId, Book, Hymn, Prayer, RecentHymn, Favourites, User } from '../types';
import { hymnsDatabase, hymnBooks } from '../data/hymnsData';
import { prayersDatabase } from '../data/prayersData';

export type AppTab = 'home' | 'hymns' | 'prayers' | 'saved' | 'settings';
export type BookLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Hymn data source. `hymns` is the single source of truth consumed across
  // the app. It is seeded from the bundled hardcoded database (fallback) and
  // the Xhosa slice is replaced at runtime from public/data/xhosa.json.
  hymns: Hymn[];
  xhosaStatus: BookLoadStatus;
  xhosaError: string | null;
  loadXhosaBook: () => void;
  selectedBookId: BookId | null;
  setSelectedBookId: (bookId: BookId | null) => void;
  activeHymn: Hymn | null;
  openHymn: (bookId: BookId, hymnNumber: number) => void;
  closeHymn: () => void;
  activePrayer: Prayer | null;
  openPrayer: (prayerId: string) => void;
  closePrayer: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Recents & Continuing
  recentHymns: RecentHymn[];
  continueReading: { bookId: BookId; hymnNumber: number } | null;
  
  // Saved / Favourites
  favourites: Favourites;
  isHymnFavourite: (bookId: BookId, hymnNumber: number) => boolean;
  toggleHymnFavourite: (bookId: BookId, hymnNumber: number) => void;
  isPrayerFavourite: (prayerId: string) => boolean;
  togglePrayerFavourite: (prayerId: string) => void;
  
  // Offline Downloads simulation
  downloadedBooks: BookId[];
  downloadBook: (bookId: BookId) => void;
  downloadProgress: { [key in BookId]?: number };
  
  // Display settings
  fontSize: number;
  setFontSize: (size: number) => void;
  projectionMode: boolean;
  setProjectionMode: (mode: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Session Authentication state & utilities
  currentUser: User | null;
  login: (email: string) => boolean;
  signUp: (email: string, fullName: string, tier: 'free' | 'individual-pro' | 'parish-license') => boolean;
  loginAsGuest: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedBookId, setSelectedBookId] = useState<BookId | null>(null);
  const [activeHymn, setActiveHymn] = useState<Hymn | null>(null);
  const [activePrayer, setActivePrayer] = useState<Prayer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ---- Hymn data source -------------------------------------------------
  // Seeded from the bundled hardcoded database so every book has a working
  // fallback. The Xhosa book is replaced with public/data/xhosa.json once the
  // user opens it (see loadXhosaBook). Other books remain hardcoded for now.
  const XHOSA_CACHE_KEY = 'mhb_xhosa_cache';
  const [hymns, setHymns] = useState<Hymn[]>(hymnsDatabase);
  const [xhosaStatus, setXhosaStatus] = useState<BookLoadStatus>('idle');
  const [xhosaError, setXhosaError] = useState<string | null>(null);
  const xhosaLoadingRef = useRef(false);

  // Verify a payload really is an array of Xhosa hymns before trusting it.
  const validateXhosa = (data: unknown): Hymn[] | null => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const allValid = data.every(
      (h: any) =>
        h &&
        h.bookId === 'xhosa' &&
        typeof h.hymnNumber === 'number' &&
        typeof h.hymnCode === 'string' &&
        typeof h.title === 'string' &&
        typeof h.lyrics === 'string'
    );
    return allValid ? (data as Hymn[]) : null;
  };

  // Swap only the Xhosa slice; other books (from the fallback) stay intact.
  const applyXhosaHymns = (xhosaHymns: Hymn[]) => {
    setHymns(prev => [...prev.filter(h => h.bookId !== 'xhosa'), ...xhosaHymns]);
  };

  const loadXhosaBook = async () => {
    // Skip if already loaded, or a load is already in flight (guards against
    // React StrictMode's double-invoked effects firing two fetches).
    if (xhosaStatus === 'loaded' || xhosaLoadingRef.current) return;
    xhosaLoadingRef.current = true;
    setXhosaStatus('loading');
    setXhosaError(null);

    try {
      const res = await fetch('/data/xhosa.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const valid = validateXhosa(await res.json());
      if (!valid) throw new Error('xhosa.json is empty or malformed');

      // Cache so the book stays available offline on later visits.
      try { localStorage.setItem(XHOSA_CACHE_KEY, JSON.stringify(valid)); } catch {}

      applyXhosaHymns(valid);
      setXhosaStatus('loaded');
    } catch (err: any) {
      // Network/fetch failure (e.g. offline): prefer a previously cached copy.
      const cached = localStorage.getItem(XHOSA_CACHE_KEY);
      if (cached) {
        try {
          const valid = validateXhosa(JSON.parse(cached));
          if (valid) {
            applyXhosaHymns(valid);
            setXhosaStatus('loaded');
            return;
          }
        } catch { /* fall through to hardcoded fallback */ }
      }
      // Final fallback: keep the bundled hardcoded Xhosa hymns already in state.
      setXhosaError(err?.message ?? 'Unable to load Xhosa hymn data');
      setXhosaStatus('error');
    } finally {
      xhosaLoadingRef.current = false;
    }
  };

  // Settings
  const [fontSize, setFontSizeState] = useState<number>(18);
  const [projectionMode, setProjectionModeState] = useState<boolean>(false);
  const [darkMode, setDarkModeState] = useState<boolean>(false);

  // Initialize from LocalStorage
  const [recentHymns, setRecentHymns] = useState<RecentHymn[]>(() => {
    const saved = localStorage.getItem('mhb_recent_hymns');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [continueReading, setContinueReading] = useState<{ bookId: BookId; hymnNumber: number } | null>(() => {
    const saved = localStorage.getItem('mhb_continue_reading');
    return saved ? JSON.parse(saved) : null;
  });

  const [favourites, setFavourites] = useState<Favourites>(() => {
    const saved = localStorage.getItem('mhb_favourites');
    return saved ? JSON.parse(saved) : { hymns: [], prayers: [] };
  });

  const [downloadedBooks, setDownloadedBooks] = useState<BookId[]>(() => {
    const saved = localStorage.getItem('mhb_downloaded_books');
    // Default English & Xhosa as pre-downloaded out-of-the-box, user can manually trigger others
    return saved ? JSON.parse(saved) : ['english', 'xhosa'];
  });

  const [downloadProgress, setDownloadProgress] = useState<{ [key in BookId]?: number }>({});

  const setFontSize = (size: number) => {
    // clamp between 14 and 36
    const clamped = Math.max(14, Math.min(36, size));
    setFontSizeState(clamped);
  };

  const setProjectionMode = (mode: boolean) => {
    setProjectionModeState(mode);
    if (mode) {
      document.documentElement.classList.add('projection');
    } else {
      document.documentElement.classList.remove('projection');
    }
  };

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mhb_recent_hymns', JSON.stringify(recentHymns));
  }, [recentHymns]);

  useEffect(() => {
    if (continueReading) {
      localStorage.setItem('mhb_continue_reading', JSON.stringify(continueReading));
    }
  }, [continueReading]);

  useEffect(() => {
    localStorage.setItem('mhb_favourites', JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    localStorage.setItem('mhb_downloaded_books', JSON.stringify(downloadedBooks));
  }, [downloadedBooks]);

  // Open hymn & update recents / continuing
  const openHymn = (bookId: BookId, hymnNumber: number) => {
    const hymn = hymns.find(h => h.bookId === bookId && h.hymnNumber === hymnNumber);
    if (hymn) {
      setActiveHymn(hymn);
      setContinueReading({ bookId, hymnNumber });
      
      // Update recents
      setRecentHymns(prev => {
        const filtered = prev.filter(item => !(item.bookId === bookId && item.hymnNumber === hymnNumber));
        const newItem: RecentHymn = {
          bookId,
          hymnNumber,
          title: hymn.title,
          viewedAt: new Date().toISOString()
        };
        return [newItem, ...filtered].slice(0, 8); // Keep last 8 viewed
      });
    }
  };

  const closeHymn = () => {
    setActiveHymn(null);
  };

  // Open Prayer
  const openPrayer = (prayerId: string) => {
    const prayer = prayersDatabase.find(p => p.id === prayerId);
    if (prayer) {
      setActivePrayer(prayer);
    }
  };

  const closePrayer = () => {
    setActivePrayer(null);
  };

  // Favourites logic
  const isHymnFavourite = (bookId: BookId, hymnNumber: number) => {
    return favourites.hymns.some(h => h.bookId === bookId && h.hymnNumber === hymnNumber);
  };

  const toggleHymnFavourite = (bookId: BookId, hymnNumber: number) => {
    setFavourites(prev => {
      const isFav = prev.hymns.some(h => h.bookId === bookId && h.hymnNumber === hymnNumber);
      let updatedHymns = [...prev.hymns];
      if (isFav) {
        updatedHymns = updatedHymns.filter(h => !(h.bookId === bookId && h.hymnNumber === hymnNumber));
      } else {
        updatedHymns.push({ bookId, hymnNumber });
      }
      return { ...prev, hymns: updatedHymns };
    });
  };

  const isPrayerFavourite = (prayerId: string) => {
    return favourites.prayers.includes(prayerId);
  };

  const togglePrayerFavourite = (prayerId: string) => {
    setFavourites(prev => {
      const isFav = prev.prayers.includes(prayerId);
      let updatedPrayers = [...prev.prayers];
      if (isFav) {
        updatedPrayers = updatedPrayers.filter(id => id !== prayerId);
      } else {
        updatedPrayers.push(prayerId);
      }
      return { ...prev, prayers: updatedPrayers };
    });
  };

  // Download simulation
  const downloadBook = (bookId: BookId) => {
    if (downloadedBooks.includes(bookId) || downloadProgress[bookId] !== undefined) {
      return; // Already downloaded or in progress
    }

    setDownloadProgress(prev => ({ ...prev, [bookId]: 0 }));
    
    // Increment progress periodically to mimic a real service worker cache download
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setDownloadProgress(prev => ({ ...prev, [bookId]: progress }));
      
      if (progress >= 100) {
        clearInterval(interval);
        setDownloadedBooks(prev => [...prev, bookId]);
        setDownloadProgress(prev => {
          const updated = { ...prev };
          delete updated[bookId];
          return updated;
        });
      }
    }, 300);
  };

  // User authentication hooks and states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mhb_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string): boolean => {
    const storedUsersJson = localStorage.getItem('mhb_registered_users');
    const registeredUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (found) {
      const userObj: User = { ...found, isGuest: false };
      setCurrentUser(userObj);
      localStorage.setItem('mhb_current_user', JSON.stringify(userObj));
      return true;
    }
    return false;
  };

  const signUp = (email: string, fullName: string, tier: 'free' | 'individual-pro' | 'parish-license'): boolean => {
    const storedUsersJson = localStorage.getItem('mhb_registered_users');
    const registeredUsers: User[] = storedUsersJson ? JSON.parse(storedUsersJson) : [];
    
    if (registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return false;
    }

    const newUser: User = {
      email: email.toLowerCase(),
      fullName,
      tier,
      isGuest: false,
      createdAt: new Date().toISOString()
    };

    const updated = [...registeredUsers, newUser];
    localStorage.setItem('mhb_registered_users', JSON.stringify(updated));
    setCurrentUser(newUser);
    localStorage.setItem('mhb_current_user', JSON.stringify(newUser));
    return true;
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      email: 'guest@methodisthymnal.org',
      fullName: 'Sanctuary Visitor',
      isGuest: true,
      tier: 'free'
    };
    setCurrentUser(guestUser);
    localStorage.setItem('mhb_current_user', JSON.stringify(guestUser));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mhb_current_user');
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      hymns,
      xhosaStatus,
      xhosaError,
      loadXhosaBook,
      selectedBookId,
      setSelectedBookId,
      activeHymn,
      openHymn,
      closeHymn,
      activePrayer,
      openPrayer,
      closePrayer,
      searchQuery,
      setSearchQuery,
      recentHymns,
      continueReading,
      favourites,
      isHymnFavourite,
      toggleHymnFavourite,
      isPrayerFavourite,
      togglePrayerFavourite,
      downloadedBooks,
      downloadBook,
      downloadProgress,
      fontSize,
      setFontSize,
      projectionMode,
      setProjectionMode,
      darkMode,
      setDarkMode,
      currentUser,
      login,
      signUp,
      loginAsGuest,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
