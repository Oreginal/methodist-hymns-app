/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { prayersDatabase } from '../data/prayersData';
import { Heart, BookOpen, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { BookId } from '../types';

export const SavedScreen: React.FC = () => {
  const {
    hymns,
    favourites,
    toggleHymnFavourite,
    togglePrayerFavourite,
    openHymn,
    openPrayer,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'hymns' | 'prayers'>('hymns');

  // Grab favourited hymn objects from database
  const favHymns = favourites.hymns.map((fav) => {
    return hymns.find((h) => h.bookId === fav.bookId && h.hymnNumber === fav.hymnNumber);
  }).filter((h): h is NonNullable<typeof h> => h !== undefined);

  // Grab favourited prayer objects from database
  const favPrayers = favourites.prayers.map((id) => {
    return prayersDatabase.find((p) => p.id === id);
  }).filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <div id="saved-screen-wrapper" className="animate-fade-in space-y-6 pb-6">
      {/* Header and description */}
      <div className="section-header space-y-2">
        <div className="w-12 h-1 bg-[#E53935] mb-2"></div>
        <h2 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-white">Saved Favourites</h2>
        <p className="text-[#757575] dark:text-zinc-400 text-sm mt-1">
          A personalized treasury of your favorite hymns and prayers, stored locally and ready for immediate sanctuary service.
        </p>
      </div>

      {/* Subtab navigation */}
      <div className="flex border-b border-gray-100 dark:border-zinc-800">
        <button
          onClick={() => setActiveSubTab('hymns')}
          className={`flex-1 pb-4 text-center text-xs font-bold uppercase tracking-widest cursor-pointer border-b-2 transition-all ${
            activeSubTab === 'hymns'
              ? 'border-[#E53935] text-[#E53935] dark:text-red-405'
              : 'border-transparent text-[#757575] hover:text-[#111111] dark:hover:text-white'
          }`}
        >
          Hymns ({favHymns.length})
        </button>
        <button
          onClick={() => setActiveSubTab('prayers')}
          className={`flex-1 pb-4 text-center text-xs font-bold uppercase tracking-widest cursor-pointer border-b-2 transition-all ${
            activeSubTab === 'prayers'
              ? 'border-[#E53935] text-[#E53935] dark:text-red-405'
              : 'border-transparent text-[#757575] hover:text-[#111111] dark:hover:text-white'
          }`}
        >
          Prayers ({favPrayers.length})
        </button>
      </div>

      {/* List content */}
      <div className="space-y-3">
        {activeSubTab === 'hymns' ? (
          favHymns.length > 0 ? (
            favHymns.map((hymn) => (
              <div
                key={`${hymn.bookId}-${hymn.hymnNumber}`}
                onClick={() => openHymn(hymn.bookId, hymn.hymnNumber)}
                className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4 rounded-2xl cursor-pointer hover:bg-red-50/5 dark:hover:bg-red-950/10 transition-all h-20 active:scale-[0.99] group"
              >
                <div className="w-10 h-10 bg-red-50/50 dark:bg-red-950/20 text-[#E53935] rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {hymn.hymnNumber}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-[#111111] dark:text-white text-base truncate group-hover:text-[#E53935]">
                    {hymn.title}
                  </h3>
                  <p className="text-[#757575] text-[10px] mt-0.5 uppercase tracking-widest">
                    {hymn.bookId} Book
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHymnFavourite(hymn.bookId, hymn.hymnNumber);
                  }}
                  className="p-2.5 text-red-300 hover:text-red-600 dark:text-zinc-550 dark:hover:text-red-400 rounded-full shrink-0 transition-all active:scale-90 cursor-pointer"
                  title="Remove from saved"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 space-y-2">
              <Heart size={36} className="text-gray-250 mx-auto" />
              <h4 className="text-base font-bold text-[#111111] dark:text-white">No saved hymns yet</h4>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                Tap the heart icon on any hymn to bookmark it for quick access.
              </p>
            </div>
          )
        ) : (
          favPrayers.length > 0 ? (
            favPrayers.map((prayer) => (
              <div
                key={prayer.id}
                onClick={() => openPrayer(prayer.id)}
                className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-start gap-4 cursor-pointer hover:shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] uppercase tracking-widest text-[#E53935] font-bold mb-1">
                    {prayer.category} Prayer
                  </span>
                  <h4 className="text-base font-bold text-[#111111] dark:text-white leading-tight truncate">
                    {prayer.title}
                  </h4>
                  <p className="text-[#757575] dark:text-zinc-400 text-xs mt-1 line-clamp-1 leading-relaxed">
                    {prayer.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePrayerFavourite(prayer.id);
                  }}
                  className="p-2.5 text-red-300 hover:text-red-600 dark:text-zinc-550 dark:hover:text-red-400 rounded-full shrink-0 transition-all active:scale-90 cursor-pointer"
                  title="Remove from saved"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 space-y-2">
              <Heart size={36} className="text-gray-250 mx-auto" />
              <h4 className="text-base font-bold text-[#111111] dark:text-white">No saved prayers yet</h4>
              <p className="text-xs text-[#757575] dark:text-zinc-400">
                Tap the heart icon on any liturgy or custom prayer to save it.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
