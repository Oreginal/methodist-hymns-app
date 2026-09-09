/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';

export const ExitConfirmToast: React.FC = () => {
  const { showExitPrompt } = useApp();

  if (!showExitPrompt) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-full
                 bg-[#111111] dark:bg-white text-white dark:text-[#111111]
                 text-xs font-bold uppercase tracking-wider shadow-lg
                 animate-fade-in pointer-events-none"
    >
      Press back again to exit
    </div>
  );
};
