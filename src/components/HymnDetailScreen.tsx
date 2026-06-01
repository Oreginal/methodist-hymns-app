/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Share, Heart, ArrowLeft, ZoomIn, ZoomOut, Monitor, Moon, Sun, Copy, Check } from 'lucide-react';

export const HymnDetailScreen: React.FC = () => {
  const {
    activeHymn,
    closeHymn,
    isHymnFavourite,
    toggleHymnFavourite,
    fontSize,
    setFontSize,
    projectionMode,
    setProjectionMode,
    darkMode,
    setDarkMode,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  if (!activeHymn) return null;

  // Split lyrics by double newline to parse separate verses/choruses (fallback path)
  const verses = activeHymn.lyrics.split('\n\n').filter((v) => v.trim().length > 0);

  // Structured bilingual verses are preferred when present (loaded books).
  const structuredVerses = activeHymn.verses;

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
    const amenSuffix = activeHymn.amen !== false ? '\n\nAmen.' : '';
    const fullText = `${activeHymn.hymnCode} - ${activeHymn.title}\n\n${activeHymn.lyrics}${amenSuffix}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleFav = () => {
    toggleHymnFavourite(activeHymn.bookId, activeHymn.hymnNumber);
  };

  const isFav = isHymnFavourite(activeHymn.bookId, activeHymn.hymnNumber);

  return (
    <div 
      id="hymn-detail-screen-wrapper"
      className={`fixed inset-0 z-[100] overflow-y-auto transition-colors duration-300 ${
        projectionMode 
          ? 'bg-black text-white' 
          : 'bg-[#FAFAFA] dark:bg-[#121212] text-gray-900 dark:text-zinc-150'
      }`}
    >
      {/* Dynamic Top App Bar (fades out in Projection Mode for absolute reading focus) */}
      {!projectionMode && (
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 h-16 bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-zinc-800/80 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={closeHymn}
              className="p-2.5 rounded-full text-[#757575] dark:text-zinc-300 hover:bg-[#FAFAFA] dark:hover:bg-zinc-800 border border-gray-100 dark:border-zinc-805 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-[#E53935] tracking-widest leading-none">
                {activeHymn.hymnCode}
              </span>
              <span className="text-[10px] font-bold text-[#757575] mt-0.5 uppercase tracking-wider leading-none">
                {activeHymn.bookId} Book
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFav}
              className={`p-2.5 rounded-full border border-gray-100 dark:border-zinc-800 transition-all active:scale-90 cursor-pointer ${
                isFav 
                  ? 'text-[#E53935] bg-red-50/50 dark:bg-red-950/20' 
                  : 'text-[#757575] hover:text-[#E53935] dark:text-zinc-400 hover:bg-gray-50'
              }`}
            >
              <Heart size={18} className={isFav ? 'fill-current' : ''} />
            </button>
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full border border-gray-100 dark:border-zinc-800 text-[#757575] hover:text-[#111111] dark:text-zinc-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
            >
              <Share size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Main Reading area */}
      <main className={`max-w-2xl mx-auto px-6 ${projectionMode ? 'py-12' : 'py-8'} space-y-8 pb-36`}>
        {/* Title & Author */}
        <div className="text-center space-y-2">
          {!projectionMode && (
            <p className="text-[#E53935] uppercase tracking-widest text-xs font-bold leading-normal">
              Methodist Hymnal
            </p>
          )}
          <h1 className={`font-headline-xl text-3xl md:text-4xl font-extrabold tracking-tight ${
            projectionMode ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}>
            {activeHymn.title}
          </h1>
          {activeHymn.author && !projectionMode && (
            <p className="text-gray-400 dark:text-zinc-500 font-medium text-sm uppercase tracking-wide">
              {activeHymn.author}
            </p>
          )}
        </div>

        {/* Quick Verse Anchors (only shown in regular reading mode) */}
        {!projectionMode && structuredVerses && structuredVerses.length > 1 && (
          <div className="flex justify-center flex-wrap gap-2 py-2">
            {structuredVerses.map((verse) => (
              <a
                key={verse.number}
                href={`#verse-${verse.number}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`verse-${verse.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-xs font-bold text-[#757575] dark:text-zinc-400 hover:text-[#E53935] hover:border-red-500/20 active:scale-95 transition-all"
              >
                V{verse.number}
              </a>
            ))}
          </div>
        )}
        {!projectionMode && !structuredVerses && verses.length > 1 && (
          <div className="flex justify-center flex-wrap gap-2 py-2">
            {verses.map((_, idx) => (
              <a
                key={idx}
                href={`#verse-${idx + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`verse-${idx + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-xs font-bold text-[#757575] dark:text-zinc-400 hover:text-[#E53935] hover:border-red-500/20 active:scale-95 transition-all"
              >
                V{idx + 1}
              </a>
            ))}
          </div>
        )}

        {/* Dynamic Lyric Body */}
        <div
          className="space-y-10 leading-relaxed tracking-normal font-serif text-center"
          style={{ fontSize: `${fontSize}px` }}
        >
          {structuredVerses ? structuredVerses.map((verse) => (
            <section
              key={verse.number}
              id={`verse-${verse.number}`}
              className={`py-4 rounded-xl transition-all ${
                projectionMode
                  ? 'border-b border-zinc-900/30'
                  : 'border-b border-gray-100/50 dark:border-zinc-900/50'
              }`}
            >
              {/* Liturgical Tag */}
              <p className="text-xs uppercase font-extrabold tracking-widest text-[#E53935] dark:text-red-400 opacity-60 mb-2">
                Verse {verse.number}
              </p>

              {/* Bilingual Lyric Lines */}
              <div className={`font-serif leading-relaxed ${
                projectionMode ? 'text-white font-medium text-2xl' : 'text-gray-700 dark:text-zinc-300'
              }`}>
                {verse.lines.map((line, lineIdx) => (
                  <div key={lineIdx} className={line.translation ? 'mb-2' : ''}>
                    <p>{line.primary}</p>
                    {line.translation && (
                      <p className={`italic text-[#E53935] dark:text-red-400 ${
                        projectionMode ? 'text-lg' : 'text-[0.85em]'
                      }`}>
                        {line.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )) : verses.map((verseContent, index) => {
            const lines = verseContent.split('\n');
            const isHeading = lines[0].startsWith('VERSE') || lines[0].startsWith('CHORUS');
            const headingText = isHeading ? lines[0] : '';
            const remainingLines = isHeading ? lines.slice(1) : lines;

            return (
              <section 
                key={index} 
                id={`verse-${index + 1}`}
                className={`py-4 rounded-xl transition-all ${
                  projectionMode 
                    ? 'border-b border-zinc-900/30' 
                    : 'border-b border-gray-100/50 dark:border-zinc-900/50'
                }`}
              >
                {/* Liturgical Tag */}
                <p className="text-xs uppercase font-extrabold tracking-widest text-[#E53935] dark:text-red-400 opacity-60 mb-2">
                  {headingText || `Verse ${index + 1}`}
                </p>
                
                {/* Lyric Verses */}
                <p className={`font-serif whitespace-pre-line leading-relaxed ${
                  projectionMode ? 'text-white font-medium text-2xl' : 'text-gray-700 dark:text-zinc-300'
                }`}>
                  {remainingLines.join('\n')}
                </p>
              </section>
            );
          })}
        </div>

        {/* Amen Liturgical Closing (shown unless explicitly disabled) */}
        {activeHymn.amen !== false && (
          <div className="text-center pt-8">
            <p className={`font-serif italic font-bold text-xl ${
              projectionMode ? 'text-white' : 'text-gray-550 dark:text-zinc-400'
            }`}>
              Amen.
            </p>
          </div>
        )}
      </main>

      {/* Floating Controls Overlay Panel (Fixed at safe area bottom) */}
      <div 
        id="detail-controls-safety-panel"
        className="fixed bottom-0 left-0 w-full z-50 px-4 pb-safe pb-4"
      >
        <div className="max-w-md mx-auto bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-850 p-4 flex items-center justify-between gap-4 transition-colors duration-300">
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFontSize(fontSize - 2)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50/50 dark:bg-zinc-900 text-[#757575] dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Decrease Font Size"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-semibold text-[#757575] w-8 text-center">
              {fontSize}px
            </span>
            <button
               onClick={() => setFontSize(fontSize + 2)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50/50 dark:bg-zinc-900 text-[#757575] dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Increase Font Size"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-gray-100 dark:bg-zinc-800"></div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50/50 dark:bg-zinc-900 text-[#757575] dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="h-6 w-[1px] bg-gray-100 dark:bg-zinc-800"></div>

          {/* Projection Indicator mode toggle */}
          <button
            onClick={() => setProjectionMode(!projectionMode)}
            className={`flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
              projectionMode
                ? 'bg-[#E53935] text-white'
                : 'bg-[#111111] dark:bg-zinc-805 text-white hover:bg-black'
            }`}
          >
            <Monitor size={15} />
            {projectionMode ? 'Exit Projection' : 'Projection Mode'}
          </button>
        </div>
      </div>

      {/* Share Modal Dialog Overlay */}
      {showShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Share Sanctuary Verse</h4>
              <p className="text-gray-500 dark:text-zinc-400 text-xs leading-normal">
                Share this hymn with congregation members, prayer networks, or projection coordinators.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-150 dark:border-zinc-90/50 font-serif text-sm text-gray-700 dark:text-zinc-300 leading-normal max-h-40 overflow-y-auto">
              <strong>{activeHymn.hymnCode} - {activeHymn.title}</strong>
              <p className="mt-1 whitespace-pre-wrap">{activeHymn.lyrics.split('\n\n')[0]}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 h-12 flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-750 dark:text-zinc-200 rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Lyrics
                  </>
                )}
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 h-12 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
