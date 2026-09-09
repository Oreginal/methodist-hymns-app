/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { hymnBooks } from '../data/hymnsData';
import { BookId } from '../types';
import { 
  Download, CheckCircle2, Moon, Sun,
  Tv, Book, Flame, MessageSquare, CreditCard, Sparkles, Smartphone, Landmark,
  Flag, Clock
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    downloadedBooks,
    downloadBook,
    downloadProgress,
    darkMode,
    setDarkMode,
    fontSize,
    setFontSize,
    openReport,
    pendingReportCount
  } = useApp();

  return (
    <div id="settings-screen-wrapper" className="animate-fade-in space-y-6 pb-6">
      {/* Header */}
      <div className="section-header space-y-2">
        <div className="w-12 h-1 bg-[#E53935] mb-2"></div>
        <h2 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-white">Settings</h2>
        <p className="text-[#757575] dark:text-zinc-400 text-sm mt-1">
          Customise your reading experience, adjust contrast levels, and download hymnals for entire offline use.
        </p>
      </div>

      {/* Offline Book Downloads Section */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#111111] dark:text-white flex items-center gap-2">
            <Download size={18} className="text-[#E53935]" />
            Manage Offline Hymnals
          </h3>
          <p className="text-xs text-[#757575] dark:text-zinc-400">
            Downloaded hymnals are cached locally and remain fully functional in church services even with complete network blackout.
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {hymnBooks.map((book) => {
            const isDownloaded = downloadedBooks.includes(book.id);
            const progress = downloadProgress[book.id];

            return (
              <div key={book.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-4">
                <div>
                  <h4 className="font-bold text-[#111111] dark:text-white text-sm shrink-0">{book.name}</h4>
                  <p className="text-xs text-[#757575] font-medium italic mt-0.5">{book.nativeName}</p>
                </div>

                <div className="shrink-0">
                  {isDownloaded ? (
                    <span className="inline-flex items-center gap-1.5 text-[9px] text-green-700 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-950/20 px-3 py-1 rounded-full uppercase tracking-wider">
                      <CheckCircle2 size={12} /> Offline Ready
                    </span>
                  ) : progress !== undefined ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                        Syncing {progress}%
                      </span>
                      <div className="w-16 bg-gray-150 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => downloadBook(book.id)}
                      className="flex items-center gap-1.5 border border-[#E53935] text-[#E53935] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Download size={14} /> Link Offline
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reader & Visual Preferences */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 space-y-4">
        <h3 className="text-lg font-bold text-[#111111] dark:text-white flex items-center gap-2">
          <Smartphone size={18} className="text-[#E53935]" />
          Visual &amp; Contrast Choices
        </h3>

        <div className="space-y-4 divide-y divide-gray-100 dark:divide-zinc-800">
          {/* Light/Dark Toggle */}
          <div className="flex items-center justify-between py-3.5 first:pt-0">
            <div>
              <h4 className="font-bold text-[#111111] dark:text-white text-sm">Theme Appearance</h4>
              <p className="text-xs text-[#757575] dark:text-zinc-400 mt-0.5">Toggle between bright light mode and dark sanctuary mode.</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-2 border border-gray-100 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#757575] dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              {darkMode ? (
                <>
                  <Sun size={15} className="text-amber-500" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon size={15} className="text-[#E53935]" />
                  Dark Mode
                </>
              )}
            </button>
          </div>

          {/* Base Font Zoom */}
          <div className="flex items-center justify-between py-3.5 last:pb-0">
            <div>
              <h4 className="font-bold text-[#111111] dark:text-white text-sm">Hymn Lyric FontSize</h4>
              <p className="text-xs text-[#757575] dark:text-zinc-400 mt-0.5">Set the baseline reading size to ensure ease of navigation.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(fontSize - 2)}
                className="w-9 h-9 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer text-[#757575]"
              >
                A-
              </button>
              <span className="text-xs font-mono font-bold text-[#757575] dark:text-zinc-400 w-8 text-center">{fontSize}px</span>
              <button
                onClick={() => setFontSize(fontSize + 2)}
                className="w-9 h-9 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer text-[#757575]"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Report a problem — the always-available route, for members who are not
          currently looking at the hymn in question. */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#111111] dark:text-white flex items-center gap-2">
            <Flag size={18} className="text-[#E53935]" />
            Found a problem?
          </h3>
          <p className="text-xs text-[#757575] dark:text-zinc-400 leading-relaxed">
            If a hymn is missing, or the words or translation are wrong, tell us and we’ll correct the hymn book.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openReport({ scope: 'general' })}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#E53935] hover:bg-[#c62828] text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition cursor-pointer"
        >
          <Flag size={15} />
          Report a missing or incorrect hymn
        </button>

        {pendingReportCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Clock size={13} className="shrink-0" />
            {pendingReportCount} report{pendingReportCount === 1 ? '' : 's'} waiting to send — they’ll go automatically once you’re online.
          </p>
        )}
      </section>

      {/* Future Ready Enterprise Architecture Demos */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#111111] dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500 animate-pulse" />
            Future-Ready Integrations
          </h3>
          <p className="text-xs text-[#757575] dark:text-zinc-400">
            These features are still being built. They'll switch on automatically once your church sets them up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Church Account & Planning */}
          <div className="p-4 border border-dashed border-gray-100 dark:border-zinc-800 rounded-xl space-y-2">
            <h4 className="font-bold text-[10px] text-[#757575] dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Tv size={14} /> Service Planning
            </h4>
            <p className="text-xs text-[#757575] dark:text-zinc-500 leading-normal">
              Automatically load the hymn list for each week's service, so it's ready before you get to church.
            </p>
          </div>

          {/* Bible Integration */}
          <div className="p-4 border border-dashed border-gray-100 dark:border-zinc-800 rounded-xl space-y-2">
            <h4 className="font-bold text-[10px] text-[#757575] dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Book size={14} /> Holy Bible integration
            </h4>
            <p className="text-xs text-[#757575] dark:text-zinc-500 leading-normal">
              See the Bible verse linked to each hymn, without leaving the app.
            </p>
          </div>

          {/* Tithing & Donations */}
          <div className="p-4 border border-dashed border-gray-100 dark:border-zinc-800 rounded-xl space-y-2">
            <h4 className="font-bold text-[10px] text-[#757575] dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Landmark size={14} /> Church Giving
            </h4>
            <p className="text-xs text-[#757575] dark:text-zinc-500 leading-normal">
              Give and support your church safely from your phone, whether it's a weekly offering or a special collection.
            </p>
          </div>

          {/* Multilingual linkages */}
          <div className="p-4 border border-dashed border-gray-100 dark:border-zinc-800 rounded-xl space-y-2">
            <h4 className="font-bold text-[10px] text-[#757575] dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Flame size={14} /> Cross-Language Link
            </h4>
            <p className="text-xs text-[#757575] dark:text-zinc-500 leading-normal">
              See the same hymn in another language. Open a hymn in one language and jump straight to its translation.
            </p>
          </div>
        </div>
      </section>

      {/* App Version Info & attribution */}
      <div className="text-center text-xs text-[#757575] pt-4 space-y-1">
        <p className="font-semibold">Hymn Book App • PWA Edition</p>
        <p className="opacity-75">v1.2.0 • Offline Local Database Active</p>
        <p className="pt-1">
          Built by{' '}
          <a
            href="https://katoresolutions.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#E53935] hover:underline"
          >
            KatOre Solutions
          </a>
        </p>
      </div>
    </div>
  );
};
