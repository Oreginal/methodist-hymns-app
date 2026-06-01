/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { prayersDatabase } from '../data/prayersData';
import { Search, Sparkles, Heart, FileText, ArrowLeft } from 'lucide-react';

export const PrayersScreen: React.FC = () => {
  const {
    openPrayer,
    activePrayer,
    closePrayer,
    isPrayerFavourite,
    togglePrayerFavourite,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Opening' | 'Morning' | 'Evening' | 'Thanksgiving' | 'Closing'>('All');

  const categories = ['All', 'Opening', 'Morning', 'Evening', 'Thanksgiving', 'Closing'] as const;

  // Search & category filter rules
  const filteredPrayers = prayersDatabase.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    if (!matchesCategory) return false;
    if (!q) return true;

    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  return (
    <div id="prayers-screen-wrapper" className="animate-fade-in space-y-6 pb-6">
      {/* Header and Branding section */}
      <div className="section-header space-y-2">
        <div className="w-12 h-1 bg-[#E53935] mb-2"></div>
        <h2 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-white">Church Prayers</h2>
        <p className="text-[#757575] dark:text-zinc-400 text-sm mt-1">Sacred and historic Methodist prayers curated for devotionals and services.</p>
      </div>

      {/* Prayer Search Bar */}
      <div className="relative group">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-805 rounded-2xl focus:ring-2 focus:ring-[#E53935] focus:border-[#E53935] text-base transition-all text-[#111111] dark:text-white shadow-sm"
          placeholder="Search prayer title or text..."
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E53935]" size={20} />
      </div>

      {/* Liturgy category selector horizontal chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4.5 h-11 rounded-full text-xs uppercase font-bold tracking-widest whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-[#E53935] text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-[#757575] dark:text-zinc-300 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* List of filtered prayers */}
      <div className="space-y-3">
        {filteredPrayers.length > 0 ? (
          filteredPrayers.map((prayer) => {
            const isFav = isPrayerFavourite(prayer.id);
            return (
              <div
                key={prayer.id}
                onClick={() => openPrayer(prayer.id)}
                className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-[#E53935] transition-all flex items-start gap-4 cursor-pointer hover:shadow-sm"
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
                  <p className="text-[#757575] dark:text-zinc-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                    {prayer.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePrayerFavourite(prayer.id);
                  }}
                  className={`p-2.5 rounded-full shrink-0 transition-all active:scale-90 cursor-pointer ${
                    isFav 
                      ? 'text-[#E53935] bg-red-50/50 dark:bg-red-950/20' 
                      : 'text-[#757575] hover:text-[#E53935] hover:bg-gray-50'
                  }`}
                >
                  <Heart size={16} className={isFav ? 'fill-current' : ''} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 p-6 space-y-2">
            <h4 className="text-base font-bold text-[#111111] dark:text-white">No devotions matched</h4>
            <p className="text-xs text-[#757575] dark:text-zinc-400">
              Try adjusting your query or category filters.
            </p>
          </div>
        )}
      </div>

      {/* Large Modal/Detail Sheet Overlay for Active Prayer */}
      {activePrayer && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
          <div className="bg-[#FAFAFA] dark:bg-[#111111] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-scale-up">
            {/* Prayer card header */}
            <div className="bg-white dark:bg-zinc-950 px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closePrayer}
                  className="p-2.5 rounded-full text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-90 transition-all border border-gray-100 dark:border-zinc-800"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#E53935] tracking-widest block leading-none">
                    {activePrayer.category} Liturgy
                  </span>
                  <h4 className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-wider block leading-none">
                    Methodist Prayers
                  </h4>
                </div>
              </div>
              <button
                onClick={() => togglePrayerFavourite(activePrayer.id)}
                className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${
                  isPrayerFavourite(activePrayer.id)
                    ? 'text-[#E53935] bg-red-50/50 dark:bg-red-950/20'
                    : 'text-gray-500 hover:text-[#E53935] hover:bg-gray-50'
                }`}
              >
                <Heart size={18} className={isPrayerFavourite(activePrayer.id) ? 'fill-current' : ''} />
              </button>
            </div>

            {/* Liturgical Body */}
            <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto font-serif">
              <h3 className="font-extrabold text-[#111111] dark:text-white text-2xl text-center leading-tight font-headline">
                {activePrayer.title}
              </h3>
              
              <p className="text-[#111111] dark:text-zinc-200 text-lg leading-relaxed text-center whitespace-pre-wrap font-serif px-2">
                {activePrayer.content}
              </p>
            </div>

            {/* Liturgical Modal Footer */}
            <div className="bg-white dark:bg-zinc-950 px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
              <button
                onClick={closePrayer}
                className="h-11 bg-[#111111] dark:bg-zinc-900 hover:bg-black text-white px-5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Close Prayer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
