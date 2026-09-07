/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { LOGO_BASE64 } from '../data/logo';
import { hymnBooks } from '../data/hymnsData';
import { Search, BookOpen, Clock, Heart, BookOpenCheck, ChevronRight } from 'lucide-react';
import { BookId } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    hymns,
    bookStatus,
    setActiveTab,
    setSelectedBookId,
    openHymn,
    continueReading,
    recentHymns,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Clear any previously selected book so the hymns tab runs the query as a
    // GLOBAL search. Leaving a book selected would silently scope the search to
    // that one book; leaving this out entirely dropped the query altogether.
    setSelectedBookId(null);
    setActiveTab('hymns');
  };

  const handleBookClick = (bookId: BookId) => {
    setSelectedBookId(bookId);
    setActiveTab('hymns');
  };

  // Last read item or default fallback
  const getContinueReadingItem = () => {
    if (continueReading) {
      return continueReading;
    }
    // Default hymn MHB 1 / E1 as fallback
    return { bookId: 'english' as BookId, hymnNumber: 1 };
  };

  const continueItem = getContinueReadingItem();
  const continueHymnId = continueItem.bookId;
  const continueHymnNum = continueItem.hymnNumber;

  // Let's grab continuing hymn details
  const continueDetails = hymns.find(
    (h) => h.bookId === continueHymnId && h.hymnNumber === continueHymnNum
  );

  return (
    <div id="home-screen-layout" className="animate-fade-in space-y-8 pb-6">
      {/* Header and App Branding */}
      <section className="flex flex-col items-center justify-center text-center pt-8 pb-4">
        <div className="w-12 h-1 bg-[#E53935] mb-6"></div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm max-w-[240px] sm:max-w-[280px] hover:shadow-md transition-all duration-300">
          <img
            src={LOGO_BASE64}
            alt="Hymn Book app logo"
            className="w-full h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="mt-6">
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-[#111111] dark:text-white">
            Hymn Book
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-[#757575] dark:text-gray-400">
            Worship. Hymns. Prayers.
          </p>
        </div>
      </section>

      {/* Global Sanctuary Search */}
      <section className="sticky top-14 z-40 bg-[#FAFAFA]/90 dark:bg-[#111111]/95 backdrop-blur-sm py-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-16 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-[#E53935] focus:border-[#E53935] text-base shadow-sm transition-all text-[#111111] dark:text-white"
            placeholder="Search hymn number, code, or title..."
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#E53935] text-white rounded-xl h-9 px-4 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all hover:bg-red-600 cursor-pointer"
          >
            GO
          </button>
        </form>
      </section>

      {/* Continue Reading Section (Bento Highlight in Black) */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#757575] flex items-center gap-2">
          <Clock size={16} className="text-[#E53935]" />
          Continue Reading
        </h3>
        <div
          onClick={() => openHymn(continueHymnId, continueHymnNum)}
          className="relative overflow-hidden rounded-3xl bg-[#111111] text-white p-6 justify-between gap-4 transition-all hover:opacity-95 cursor-pointer group active:scale-[0.99] shadow-sm"
        >
          <div>
            <span className="text-xs text-white/60 mb-1 block">
              {continueDetails?.bookId?.toUpperCase() || 'ENGLISH'} HYMN BOOK
            </span>
            <span className="text-[#E53935] font-mono text-sm font-bold block mb-1">
              {continueDetails?.hymnCode || `MHB ${continueHymnNum}`}
            </span>
            <h4 className="text-xl font-bold text-white mb-2 leading-tight">
              {continueDetails?.title || 'Holy, Holy, Holy'}
            </h4>
            <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-[#E53935]"></div>
            </div>
            <p className="text-[10px] mt-2 text-white/50 italic">
              Verse 1 of 5 • Tap to continue reading
            </p>
          </div>
        </div>
      </section>

      {/* Available Hymn Books.
          A uniform vertical list, not a grid: the four books have names of very
          different lengths, so a 2-up grid left a ragged hole and wrapped some
          titles onto two lines. A list keeps every row identical, scales to any
          number of books, and gives each a full-width tap target. */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#757575]">Books</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100/70 dark:divide-zinc-800/70 overflow-hidden">
          {hymnBooks.map((book) => {
            const accent =
              book.id === 'sesotho' ? 'bg-green-600'
              : book.id === 'setswana' ? 'bg-orange-500'
              : 'bg-[#E53935]';
            // A book's real contents only arrive when it is opened, so until
            // then `hymns` holds just the small bundled fallback. Showing that
            // count would advertise "3 hymns" for a book of 134 — so the count
            // appears only once the book has actually loaded.
            const count = bookStatus[book.id] === 'loaded'
              ? hymns.filter((h) => h.bookId === book.id).length
              : null;

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => handleBookClick(book.id)}
                className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-red-50/30 dark:hover:bg-red-950/10 active:bg-red-50/60 dark:active:bg-red-950/20 transition-colors cursor-pointer group"
              >
                {/* Spine — the colour that identifies the book at a glance */}
                <span className={`w-1 h-11 rounded-full shrink-0 ${accent}`} />

                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[#111111] dark:text-white text-[15px] leading-tight truncate group-hover:text-[#E53935] transition-colors">
                    {book.name}
                  </span>
                  <span className="block text-[#757575] dark:text-zinc-400 text-xs mt-0.5 truncate">
                    {book.nativeName}
                    {count !== null && count > 0 && <span className="tabular-nums"> · {count} hymns</span>}
                  </span>
                </span>

                <ChevronRight
                  size={18}
                  className="shrink-0 text-gray-300 dark:text-zinc-600 group-hover:text-[#E53935] transition-colors"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Recently Viewed Hymns list */}
      {recentHymns.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#757575] flex items-center gap-2">
            <Clock size={16} className="text-[#757575]" />
            Recently Viewed
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-2 divide-y divide-gray-100/60 dark:divide-zinc-800">
            {recentHymns.slice(0, 4).map((h) => (
              <div
                key={`${h.bookId}-${h.hymnNumber}`}
                onClick={() => openHymn(h.bookId, h.hymnNumber)}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl cursor-pointer transition-colors"
               >
                <div className="w-10 h-10 bg-[#FAFAFA] dark:bg-zinc-800 rounded-xl flex items-center justify-center text-xs font-bold text-[#111111] dark:text-zinc-300">
                  {h.hymnNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#111111] dark:text-white truncate">
                    {h.title}
                  </h4>
                  <p className="text-[10px] text-[#757575] uppercase tracking-wider mt-0.5">
                    {h.bookId} Book
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
