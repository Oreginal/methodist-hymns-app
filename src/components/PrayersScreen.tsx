/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

export const PrayersScreen: React.FC = () => {
  return (
    <div id="prayers-screen-wrapper" className="animate-fade-in space-y-6 pb-6">
      {/* Header and Branding section */}
      <div className="section-header space-y-2">
        <div className="w-12 h-1 bg-[#E53935] mb-2"></div>
        <h2 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-white">Church Prayers</h2>
        <p className="text-[#757575] dark:text-zinc-400 text-sm mt-1">Prayers for devotionals and services.</p>
      </div>

      {/* Coming soon placeholder */}
      <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-[#E53935] flex items-center justify-center mx-auto">
          <Sparkles size={22} />
        </div>
        <h4 className="text-lg font-bold text-[#111111] dark:text-white">Coming Soon</h4>
        <p className="text-sm text-[#757575] dark:text-zinc-400 max-w-xs mx-auto">
          Prayers are on their way. We're still putting the right content together for this section.
        </p>
      </div>
    </div>
  );
};
