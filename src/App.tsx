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
import { SaaSGatewayScreen } from './components/SaaSGatewayScreen';
import { LOGO_BASE64 } from './data/logo';

const MainLayout: React.FC = () => {
  const { activeTab, activeHymn, currentUser } = useApp();

  if (!currentUser) {
    return <SaaSGatewayScreen />;
  }

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
      {/* Top Sanctuary Safety Header (only shown if not in projection mode of active reading) */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-zinc-800/80 px-5 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#111111] dark:text-white uppercase tracking-tight font-sans flex items-center gap-2">
          <img 
            src={LOGO_BASE64} 
            alt="Methodist Hymn Book Logo" 
            className="w-8 h-8 object-contain" 
            referrerPolicy="no-referrer"
          />
          Methodist <span className="text-[#E53935] font-extrabold">Hymn Book</span>
        </h1>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#757575] dark:text-zinc-400 bg-[#FAFAFA] dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-3 py-1 rounded-full uppercase tracking-wider">
          Offline Caching Active
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
