/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { hymnBooks } from '../data/hymnsData';
import { Search, Heart, ArrowLeft, SlidersHorizontal, List, FolderHeart, History, Calendar, Download, Flag } from 'lucide-react';

export const BookScreen: React.FC = () => {
  const {
    hymns,
    bookStatus,
    loadBook,
    loadAllBooks,
    openReport,
    selectedBookId,
    setSelectedBookId,
    openHymn,
    favourites,
    toggleHymnFavourite,
    isHymnFavourite,
    searchQuery,
    setSearchQuery,
    recentHymns,
    downloadedBooks,
    downloadBook,
    downloadProgress
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'favourites' | 'recent'>('all');

  // Dynamically load the selected hymn book (public/data/<bookId>.json) on open.
  // The loader is self-guarding, so it only fetches once per book per session,
  // and a book with no imported JSON falls back to the bundled hymns.
  useEffect(() => {
    if (selectedBookId) {
      loadBook(selectedBookId);
    }
    // loadBook is intentionally omitted: it is stable enough via its internal
    // guards and depending on it would re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId]);

  // A search typed on the home screen arrives here with no book selected. It is
  // a GLOBAL search, so it must look across every book rather than falling
  // through to the book picker (which silently dropped the query).
  const globalQuery = !selectedBookId ? searchQuery.trim().toLowerCase() : '';

  useEffect(() => {
    // A book can only be searched once it has been fetched.
    if (globalQuery) loadAllBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalQuery.length > 0]);

  if (globalQuery) {
    const matches = hymns
      .filter((h) =>
        h.hymnCode.toLowerCase() === globalQuery ||
        String(h.hymnNumber) === globalQuery ||
        h.title.toLowerCase().includes(globalQuery) ||
        h.lyrics.toLowerCase().includes(globalQuery) ||
        (h.verses?.some((v) =>
          v.lines.some(
            (l) =>
              l.primary.toLowerCase().includes(globalQuery) ||
              (l.translation?.toLowerCase().includes(globalQuery) ?? false)
          )
        ) ?? false)
      )
      .sort((a, b) => a.bookId.localeCompare(b.bookId) || a.hymnNumber - b.hymnNumber);

    const stillLoading = hymnBooks.some((b) => bookStatus[b.id] === 'loading');

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full border border-gray-100 dark:border-zinc-800 text-[#757575] dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#111111] dark:text-white truncate">
              Results for “{searchQuery.trim()}”
            </h2>
            <p className="text-xs text-[#757575] dark:text-zinc-400 mt-0.5">
              {stillLoading ? 'Searching all books…' : `${matches.length} hymn${matches.length === 1 ? '' : 's'} across all books`}
            </p>
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-2.5">
            {matches.map((hymn) => (
              <div
                key={`${hymn.bookId}-${hymn.hymnNumber}`}
                onClick={() => openHymn(hymn.bookId, hymn.hymnNumber)}
                className="flex items-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/70 p-4 rounded-xl cursor-pointer hover:border-red-500/30 transition-all active:scale-[0.98]"
              >
                <div className="w-16 flex flex-col items-center justify-center border-r border-gray-100 dark:border-zinc-800/80 mr-4 shrink-0">
                  <span className="font-sans font-bold text-[9px] text-[#E53935] tracking-widest uppercase">
                    {hymn.bookId.slice(0, 3)}
                  </span>
                  <span className="text-xl font-bold text-[#111111] dark:text-white leading-tight mt-0.5">
                    {hymn.hymnNumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#111111] dark:text-white text-base leading-snug truncate">
                    {hymn.title}
                  </h3>
                  <p className="text-[#757575] dark:text-zinc-500 text-[10px] mt-0.5 truncate uppercase tracking-widest">
                    {hymnBooks.find((b) => b.id === hymn.bookId)?.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : !stillLoading && (
          <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-850 p-6 space-y-2">
            <h4 className="text-base font-bold text-[#111111] dark:text-white">No hymns found</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Try searching by hymn code (e.g. “X11”), hymn number, or keywords.
            </p>
            <button
              type="button"
              onClick={() => openReport({ scope: 'general', suggestedKind: 'missing-hymn' })}
              className="inline-flex items-center gap-2 mt-3 min-h-[44px] px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-[#E53935] hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
            >
              <Flag size={14} />
              Report a missing hymn
            </button>
          </div>
        )}
      </div>
    );
  }

  // Handle book selection fallback
  if (!selectedBookId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="section-header space-y-2">
          <div className="w-12 h-1 bg-[#E53935] mb-2"></div>
          <h2 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-white">Choose a Hymnal</h2>
          <p className="text-[#757575] dark:text-zinc-400 text-sm mt-1">Select one of our four official hymn books to begin reading.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {hymnBooks.map((book) => {
            const isDownloaded = downloadedBooks.includes(book.id);
            const progress = downloadProgress[book.id];
            
            return (
              <div
                key={book.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-4 hover:border-[#E53935] hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedBookId(book.id)}>
                  <span className="text-[#E53935] font-bold text-xs tracking-widest uppercase block mb-1">
                    {book.nativeName}
                  </span>
                  <h4 className="text-[17px] font-bold text-[#111111] dark:text-white mt-0.5">{book.name}</h4>
                  <p className="text-[#757575] dark:text-zinc-400 text-xs mt-1 leading-relaxed">{book.description}</p>
                </div>
                
                <div className="shrink-0 flex items-center">
                  {isDownloaded ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Offline Ready
                    </span>
                  ) : progress !== undefined ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-amber-500 font-semibold uppercase tracking-wider animate-pulse">
                        Syncing {progress}%
                      </span>
                      <div className="w-20 bg-gray-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => downloadBook(book.id)}
                      className="p-3 text-[#757575] hover:text-[#E53935] dark:text-zinc-400 hover:bg-[#FAFAFA] dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer"
                      title="Download for offline access"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedBook = hymnBooks.find((b) => b.id === selectedBookId)!;

  // Hymns logic — sourced from context (Xhosa is loaded dynamically).
  // Defensive sort: always render hymns in numeric ascending order by hymnNumber,
  // independent of data/insertion order. .filter() returns a fresh array, so .sort()
  // does not mutate the hymns state held in context.
  const bookHymns = hymns
    .filter((h) => h.bookId === selectedBookId)
    .sort((a, b) => a.hymnNumber - b.hymnNumber);
  const selectedBookName =
    hymnBooks.find((b) => b.id === selectedBookId)?.name ?? 'hymn book';
  const isBookLoading = selectedBookId ? bookStatus[selectedBookId] === 'loading' : false;
  const isBookError = selectedBookId ? bookStatus[selectedBookId] === 'error' : false;

  // Search logic. High accuracy queries supporting: X11, 11, Bulelani, Bulelani kuYeho inside current book
  const filteredHymns = bookHymns.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    // 1. Check exact code Match (e.g. "X11", "E1")
    if (h.hymnCode.toLowerCase() === q) return true;

    // 2. Check exact Number / partial Match
    if (String(h.hymnNumber) === q) return true;

    // 3. Title or partial title
    if (h.title.toLowerCase().includes(q)) return true;

    // 4. Lyrics partial matching for deep searches
    if (h.lyrics.toLowerCase().includes(q)) return true;

    // 5. Structured verse matching (covers English translation text)
    if (h.verses?.some((verse) =>
      verse.lines.some((line) =>
        line.primary.toLowerCase().includes(q) ||
        (line.translation?.toLowerCase().includes(q) ?? false)
      )
    )) return true;

    return false;
  });

  // Filter selection rules
  const displayHymns = filteredHymns.filter((h) => {
    if (activeFilter === 'favourites') {
      return isHymnFavourite(h.bookId, h.hymnNumber);
    }
    if (activeFilter === 'recent') {
      return recentHymns.some((r) => r.bookId === h.bookId && r.hymnNumber === h.hymnNumber);
    }
    return true;
  });

  const isBookOfflineObj = downloadedBooks.includes(selectedBookId);

  return (
    <div id="book-screen-view" className="animate-fade-in space-y-5 pb-6">
      {/* Pinned Book Header with Back Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedBookId(null)}
          className="p-2.5 rounded-full border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 cursor-pointer active:scale-90 transition-all shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-xs uppercase font-extrabold text-[#E53935] tracking-widest">{selectedBook.nativeName}</span>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-0.5">{selectedBook.name}</h2>
        </div>
      </div>

      {/* Selected book dynamic-load status */}
      {isBookLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 text-sm text-[#757575] dark:text-zinc-400">
          <span className="w-4 h-4 border-2 border-[#E53935] border-t-transparent rounded-full animate-spin shrink-0" />
          Loading the latest {selectedBookName} hymns…
        </div>
      )}
      {isBookError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-sm text-amber-800 dark:text-amber-300">
          Couldn’t fetch the latest {selectedBookName} hymns — showing the bundled offline copy.
        </div>
      )}

      {/* Offline sync status */}
      {!isBookOfflineObj && (
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 flex items-center justify-between gap-4">
          <p className="text-sm text-orange-800 dark:text-orange-300">
            This book is currently loading over the server. Download to enable full offline support.
          </p>
          <button
            onClick={() => downloadBook(selectedBookId)}
            className="flex items-center gap-2 bg-[#E53935] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer uppercase tracking-wider shrink-0 shadow-sm"
          >
            <Download size={14} /> Download
          </button>
        </div>
      )}

      {/* Book Search Bar */}
      <div className="relative group">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-805 rounded-2xl focus:ring-2 focus:ring-[#E53935] focus:border-[#E53935] text-base transition-all text-[#111111] dark:text-white shadow-sm"
          placeholder="Hymn #, Title, or Lyrics (e.g. '1' or 'O for a thousand')"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E53935]" size={20} />
      </div>

      {/* Sticky Chip Navigation Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 outline-none no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-2 px-5 h-11 rounded-full text-xs uppercase font-bold tracking-widest whitespace-nowrap cursor-pointer transition-all active:scale-95 ${
            activeFilter === 'all'
              ? 'bg-[#E53935] text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 text-[#757575] dark:text-zinc-350 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
          }`}
        >
          <List size={14} />
          All Hymns
        </button>

        <button
          onClick={() => setActiveFilter('favourites')}
          className={`flex items-center gap-2 px-5 h-11 rounded-full text-xs uppercase font-bold tracking-widest whitespace-nowrap cursor-pointer transition-all active:scale-95 ${
            activeFilter === 'favourites'
              ? 'bg-[#E53935] text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 text-[#757575] dark:text-zinc-350 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
          }`}
        >
          <FolderHeart size={14} />
          Saved ({favourites.hymns.filter(h => h.bookId === selectedBookId).length})
        </button>

        <button
          onClick={() => setActiveFilter('recent')}
          className={`flex items-center gap-2 px-5 h-11 rounded-full text-xs uppercase font-bold tracking-widest whitespace-nowrap cursor-pointer transition-all active:scale-95 ${
            activeFilter === 'recent'
              ? 'bg-[#E53935] text-white shadow-sm'
              : 'bg-white dark:bg-zinc-900 text-[#757575] dark:text-zinc-350 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
          }`}
        >
          <History size={14} />
          Recent
        </button>
      </div>

      {/* Structured List of Hymns */}
      <div className="space-y-2.5">
        {isBookLoading ? null : displayHymns.length > 0 ? (
          displayHymns.map((hymn) => {
            const isFav = isHymnFavourite(hymn.bookId, hymn.hymnNumber);
            const labelCode = selectedBookId === 'english' ? 'MHB' : hymn.hymnCode.replace(/[0-9]/g, '');

            return (
              <div
                key={`${hymn.bookId}-${hymn.hymnNumber}`}
                onClick={() => openHymn(hymn.bookId, hymn.hymnNumber)}
                className="hymn-list-item flex items-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/70 p-4 rounded-xl cursor-pointer hover:bg-red-50/10 dark:hover:bg-red-950/10 hover:border-red-500/30 transition-all h-20 active:scale-[0.98]"
              >
                {/* Liturgical numeric left divider badge */}
                <div className="w-16 flex flex-col items-center justify-center border-r border-gray-100 dark:border-zinc-800/80 mr-4 shrink-0">
                  <span className="font-sans font-bold text-[9px] text-[#E53935] dark:text-[#ff4d4d] tracking-widest uppercase">
                    {labelCode}
                  </span>
                  <span className="text-xl font-bold text-[#111111] dark:text-white leading-tight mt-0.5">
                    {hymn.hymnNumber}
                  </span>
                </div>

                {/* Hymn Summary */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-[#111111] dark:text-white text-base leading-snug truncate group-hover:text-[#E53935]">
                    {hymn.title}
                  </h3>
                  {hymn.author && (
                    <p className="text-[#757575] dark:text-zinc-500 text-[10px] mt-0.5 truncate uppercase tracking-widest">
                      {hymn.author}
                    </p>
                  )}
                </div>

                {/* Bookmark Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHymnFavourite(hymn.bookId, hymn.hymnNumber);
                  }}
                  className={`p-3 rounded-full shrink-0 transition-all active:scale-90 cursor-pointer ${
                    isFav 
                      ? 'text-[#E53935] bg-red-50/50 dark:bg-[#1e1414]' 
                      : 'text-[#757575] hover:text-[#E53935] hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Heart size={18} className={isFav ? 'fill-current' : ''} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-850 p-6 space-y-2">
            <h4 className="text-base font-bold text-[#111111] dark:text-white">No hymns found</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Try searching by hymn code (e.g. “X11”), hymn number, or keywords.
            </p>
            {/* Highest-intent moment to report a gap: the member looked and it
                wasn't there. Pre-fills the book and whatever they searched. */}
            <button
              type="button"
              onClick={() =>
                openReport({
                  scope: 'book',
                  bookId: selectedBookId ?? undefined,
                  hymnNumber: /^\d+$/.test(searchQuery.trim()) ? Number(searchQuery.trim()) : undefined,
                  hymnTitle: /^\d+$/.test(searchQuery.trim()) ? undefined : searchQuery.trim() || undefined,
                  suggestedKind: 'missing-hymn'
                })
              }
              className="inline-flex items-center gap-2 mt-3 min-h-[44px] px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-[#E53935] hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
            >
              <Flag size={14} />
              Report a missing hymn
            </button>
          </div>
        )}

        {/* Liturgical Theme Banner Card (Advent & Christmas) */}
        <div className="relative w-full h-44 rounded-xl overflow-hidden mt-6 group">
          <img
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.35] group-hover:scale-105 transition-transform duration-700"
            alt="An artistic sanctuary interior with sunlight streaming through gothic windows"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_yt3z_-os30VqpEuMHaTdqNU8bEI0ey_HuKDxA-5RlsYkr-k8H4I0EuFXsmLMlyJDeRC4wDWrTBl5e4vnTcxy2IWW0z-aL9W7ZM8Dx9YrQA90N9CtoS_lGv2XQpgoGNUzcAMtOmAC7Ief9FbJLUFE1ejGQ115wgc4oH5kQYlO5WinUEBig85ONuMXSyjmgB3C5D9F63pCKVCdg4k8QQpFIAJaiVpuiDgkpFR0o9HELL6GUoxmiwNyVkvKeBkkXYPLeapdLIUs2Cc"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-5">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest text-red-500 uppercase mb-1">
              <Calendar size={12} /> Liturgical Season
            </div>
            <h4 className="text-white font-black text-lg">Sanctuary Calendar</h4>
            <p className="text-white/80 text-sm mt-0.5 leading-normal">
              Explore hymns and prayers prepared for Advent &amp; Christmas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
