/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp, AppTab } from '../context/AppContext';
import { Home, BookOpen, Sparkles, Heart, Settings } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, closeHymn, closePrayer, setSelectedBookId } = useApp();

  const handleTabClick = (tab: AppTab) => {
    // Reset view stacks when switching tabs
    closeHymn();
    closePrayer();
    if (tab !== 'hymns') {
      setSelectedBookId(null);
    }
    setActiveTab(tab);
  };

  const navItems: { tab: AppTab; label: string; icon: React.ComponentType<any> }[] = [
    { tab: 'home', label: 'Home', icon: Home },
    { tab: 'hymns', label: 'Hymns', icon: BookOpen },
    { tab: 'prayers', label: 'Prayers', icon: Sparkles },
    { tab: 'saved', label: 'Saved', icon: Heart },
    { tab: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav 
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 w-full flex justify-around items-center h-20 px-2 pb-safe bg-white dark:bg-[#111111] border-t border-gray-100 dark:border-zinc-800/85 z-50 transition-colors duration-300"
    >
      {navItems.map(({ tab, label, icon: Icon }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            id={`nav-tab-${tab}`}
            onClick={() => handleTabClick(tab)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 cursor-pointer ${
              isActive
                ? 'text-[#E53935] dark:text-[#ff4d4d] font-semibold font-sans'
                : 'text-[#757575] dark:text-zinc-400 hover:text-[#E53935] dark:hover:text-[#ff4d4d]'
            }`}
          >
            <div className={`p-1.5 rounded-full transition-all duration-200 ${
              isActive ? 'bg-red-50/50 dark:bg-red-950/25 scale-105' : 'bg-transparent'
            }`}>
              <Icon size={21} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
            </div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest mt-0.5">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};
