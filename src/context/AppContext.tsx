/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  BookId, Book, Hymn, Prayer, RecentHymn, Favourites, User,
  IssueReport, ReportTarget, ReportSubmitState
} from '../types';
import { hymnsDatabase, hymnBooks } from '../data/hymnsData';
import { prayersDatabase } from '../data/prayersData';

export type AppTab = 'home' | 'hymns' | 'prayers' | 'saved' | 'settings';
export type BookLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Hymn data source. `hymns` is the single source of truth consumed across
  // the app. It is seeded from the bundled hardcoded database (fallback) and
  // each book's slice is replaced at runtime from public/data/<bookId>.json.
  hymns: Hymn[];
  bookStatus: Record<BookId, BookLoadStatus>;
  bookError: Record<BookId, string | null>;
  loadBook: (bookId: BookId) => void;
  // Loads every book at once — used by the global search on the home screen,
  // which can only find a hymn in a book that has actually been fetched.
  loadAllBooks: () => void;
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
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Session Authentication state & utilities
  // Issue reporting. `reportTarget` non-null means the report sheet is open.
  reportTarget: ReportTarget | null;
  openReport: (target: ReportTarget) => void;
  closeReport: () => void;
  submitReport: (report: IssueReport) => Promise<ReportSubmitState>;
  reportState: ReportSubmitState;
  reportError: string | null;
  pendingReportCount: number;

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
  // fallback. Each book is replaced with public/data/<bookId>.json once the
  // user opens it (see loadBook); a book with no imported JSON yet simply keeps
  // its bundled hymns.
  const bookCacheKey = (bookId: BookId) => `mhb_book_cache_${bookId}`;
  const emptyBookRecord = <T,>(value: T): Record<BookId, T> =>
    ({ xhosa: value, setswana: value, sesotho: value, english: value });

  const [hymns, setHymns] = useState<Hymn[]>(hymnsDatabase);
  const [bookStatus, setBookStatus] = useState<Record<BookId, BookLoadStatus>>(
    emptyBookRecord<BookLoadStatus>('idle')
  );
  const [bookError, setBookError] = useState<Record<BookId, string | null>>(
    emptyBookRecord<string | null>(null)
  );
  // Books with a fetch in flight, so React StrictMode's double-invoked effects
  // cannot fire two requests for the same book.
  const loadingBooksRef = useRef<Set<BookId>>(new Set());

  // Verify a payload really is an array of hymns for the requested book.
  const validateBook = (data: unknown, bookId: BookId): Hymn[] | null => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const allValid = data.every(
      (h: any) =>
        h &&
        h.bookId === bookId &&
        typeof h.hymnNumber === 'number' &&
        typeof h.hymnCode === 'string' &&
        typeof h.title === 'string' &&
        typeof h.lyrics === 'string'
    );
    return allValid ? (data as Hymn[]) : null;
  };

  // Swap only this book's slice; other books (from the fallback) stay intact.
  const applyBookHymns = (bookId: BookId, bookHymns: Hymn[]) => {
    setHymns(prev => [...prev.filter(h => h.bookId !== bookId), ...bookHymns]);
  };

  const loadBook = async (bookId: BookId) => {
    // Skip if already loaded, or a load is already in flight for this book.
    if (bookStatus[bookId] === 'loaded' || loadingBooksRef.current.has(bookId)) return;
    loadingBooksRef.current.add(bookId);
    setBookStatus(prev => ({ ...prev, [bookId]: 'loading' }));
    setBookError(prev => ({ ...prev, [bookId]: null }));

    try {
      const res = await fetch(`/data/${bookId}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const valid = validateBook(await res.json(), bookId);
      if (!valid) throw new Error(`${bookId}.json is empty or malformed`);

      // Cache so the book stays available offline on later visits.
      try { localStorage.setItem(bookCacheKey(bookId), JSON.stringify(valid)); } catch {}

      applyBookHymns(bookId, valid);
      setBookStatus(prev => ({ ...prev, [bookId]: 'loaded' }));
    } catch (err: any) {
      // Network/fetch failure (e.g. offline), or a book that has not been
      // imported yet and so has no JSON: prefer a previously cached copy.
      const cached = localStorage.getItem(bookCacheKey(bookId));
      if (cached) {
        try {
          const valid = validateBook(JSON.parse(cached), bookId);
          if (valid) {
            applyBookHymns(bookId, valid);
            setBookStatus(prev => ({ ...prev, [bookId]: 'loaded' }));
            return;
          }
        } catch { /* fall through to hardcoded fallback */ }
      }
      // Final fallback: keep the bundled hardcoded hymns already in state.
      setBookError(prev => ({ ...prev, [bookId]: err?.message ?? `Unable to load ${bookId} hymn data` }));
      setBookStatus(prev => ({ ...prev, [bookId]: 'error' }));
    } finally {
      loadingBooksRef.current.delete(bookId);
    }
  };

  // Settings
  const [fontSize, setFontSizeState] = useState<number>(18);
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
      email: 'guest@hymnbook.app',
      fullName: 'Sanctuary Visitor',
      isGuest: true,
      tier: 'free'
    };
    setCurrentUser(guestUser);
    localStorage.setItem('mhb_current_user', JSON.stringify(guestUser));
  };

  // ---- Issue reporting --------------------------------------------------
  // Reports POST to /api/report, which emails them. The app is offline-first,
  // so a report that cannot be sent right now is queued in localStorage and
  // retried on the next load rather than being lost with an error toast.
  const PENDING_REPORTS_KEY = 'mhb_pending_reports';
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportState, setReportState] = useState<ReportSubmitState>('idle');
  const [reportError, setReportError] = useState<string | null>(null);
  const [pendingReportCount, setPendingReportCount] = useState(0);

  const readPendingReports = (): IssueReport[] => {
    try {
      const raw = localStorage.getItem(PENDING_REPORTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writePendingReports = (reports: IssueReport[]) => {
    try {
      localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(reports));
    } catch { /* storage full or blocked — the report is still in flight state */ }
    setPendingReportCount(reports.length);
  };

  // POST one report. Returns true only on a 2xx. A 4xx is the caller's fault
  // and must NOT be queued for retry — it would retry forever.
  const postReport = async (report: IssueReport): Promise<{ ok: boolean; retryable: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(report)
      });
      // A 200 alone is not proof of delivery: a dev server or an SPA fallback
      // will happily answer /api/report with index.html. Only a real JSON
      // acknowledgement from the function counts as sent.
      let payload: any;
      try { payload = await res.json(); } catch { payload = undefined; }

      if (res.ok) {
        if (payload?.ok === true) return { ok: true, retryable: false };
        // Reached something that isn't our API — treat as transient so the
        // report is queued rather than silently discarded.
        return { ok: false, retryable: true };
      }
      // Only a genuine rejection of THIS payload is unrecoverable — retrying it
      // would fail forever and the user must edit it. Everything else (404 from
      // a misrouted or not-yet-deployed function, 5xx, a gateway error) is not
      // the reporter's fault, so their text is queued rather than discarded.
      const payloadRejected = res.status === 400 || res.status === 413 || res.status === 422;
      return { ok: false, retryable: !payloadRejected, error: payload?.error };
    } catch {
      // Network failure (offline, DNS, blocked) — always worth retrying.
      return { ok: false, retryable: true };
    }
  };

  const submitReport = async (report: IssueReport): Promise<ReportSubmitState> => {
    setReportState('sending');
    setReportError(null);

    const result = await postReport(report);
    if (result.ok) {
      setReportState('sent');
      return 'sent';
    }
    if (result.retryable) {
      writePendingReports([...readPendingReports(), report]);
      setReportState('queued');
      return 'queued';
    }
    setReportError(result.error ?? 'That report could not be sent.');
    setReportState('error');
    return 'error';
  };

  const openReport = (target: ReportTarget) => {
    setReportState('idle');
    setReportError(null);
    setReportTarget(target);
  };
  const closeReport = () => setReportTarget(null);

  const loadAllBooks = () => {
    for (const id of ['xhosa', 'setswana', 'sesotho', 'english'] as BookId[]) loadBook(id);
  };

  // Flush anything queued from a previous offline session, once, on mount and
  // whenever the browser regains connectivity.
  useEffect(() => {
    let cancelled = false;

    const flush = async () => {
      const queue = readPendingReports();
      if (queue.length === 0) {
        setPendingReportCount(0);
        return;
      }
      const remaining: IssueReport[] = [];
      for (const report of queue) {
        const result = await postReport(report);
        // Keep only what is still worth retrying; drop permanently-rejected
        // reports so a bad payload cannot wedge the queue forever.
        if (!result.ok && result.retryable) remaining.push(report);
      }
      if (!cancelled) writePendingReports(remaining);
    };

    flush();
    window.addEventListener('online', flush);
    return () => {
      cancelled = true;
      window.removeEventListener('online', flush);
    };
  }, []);

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mhb_current_user');
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      hymns,
      bookStatus,
      bookError,
      loadBook,
      loadAllBooks,
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
      darkMode,
      setDarkMode,
      reportTarget,
      openReport,
      closeReport,
      submitReport,
      reportState,
      reportError,
      pendingReportCount,
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
