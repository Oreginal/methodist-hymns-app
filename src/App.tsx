/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNavigation } from './components/BottomNavigation';
import { HomeScreen } from './components/HomeScreen';
import { BookScreen } from './components/BookScreen';
import { PrayersScreen } from './components/PrayersScreen';
import { SavedScreen } from './components/SavedScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HymnDetailScreen } from './components/HymnDetailScreen';
import { LOGO_BASE64 } from './data/logo';
import { ReportIssueSheet } from './components/ReportIssueSheet';

const MainLayout: React.FC = () => {
  const { activeTab, activeHymn } = useApp();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'hymns':
        return <BookScreen />;
      case 'prayers':
        return <PrayersScreen />;
      case 'saved':
        return <SavedScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#111111] flex flex-col transition-colors duration-300">
      {/* Top app header */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-zinc-800/80 px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
        {/* min-w-0 + nowrap keeps the wordmark on one line; without it the title
            wrapped and collided with the badge on a 390px screen. */}
        <h1 className="min-w-0 text-base sm:text-lg font-bold text-[#111111] dark:text-white uppercase tracking-tight font-sans flex items-center gap-2 whitespace-nowrap">
          {/* The logo art is transparent and almost entirely near-black, so it
              vanishes against the dark header. Sit it on a light chip — the
              same treatment the home-screen hero already uses. In light mode
              the chip matches the header, so nothing changes there. */}
          <span className="shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            <img
              src={LOGO_BASE64}
              alt=""
              aria-hidden="true"
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </span>
          <span className="truncate">
            <span className="text-[#E53935] font-extrabold">Hymn Book</span>
          </span>
        </h1>
        {/* Full pill needs room the narrowest phones don't have, so below `sm`
            it collapses to a dot + short label. */}
        <div
          title="Offline caching active"
          className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-[#757575] dark:text-zinc-400 bg-[#FAFAFA] dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="hidden sm:inline">Offline Caching Active</span>
          <span className="sm:hidden">Offline</span>
        </div>
      </header>

      {/* Main Core Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-6 pb-28">
        {renderActiveScreen()}
      </main>

      {/* Standard bottom dock navigation bar */}
      <BottomNavigation />

      {/* E-Reader Hymn Sheet Overlay */}
      {activeHymn && <HymnDetailScreen />}

      {/* Global report sheet — opened from any screen via openReport(). */}
      <ReportIssueSheet />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
