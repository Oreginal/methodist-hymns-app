/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import type { AppTab } from '../context/AppContext';

// A snapshot of everything the back-press priority chain needs. The overlay
// fields are typed `unknown` (which already covers null/undefined) so this
// stays decoupled from the concrete Hymn/Prayer/BookId types in AppContext —
// the chain only ever asks "is this set?". If a new dismissible overlay is
// added to AppContext, add it here AND to resolveBackAction below, or the
// back button will silently skip over it instead of dismissing it first.
export interface BackButtonSnapshot {
  reportTarget: unknown;
  showShareModal: boolean;
  activeHymn: unknown;
  activePrayer: unknown;
  selectedBookId: unknown;
  searchQuery: string;
  activeTab: AppTab;
}

export type BackAction =
  | 'close-report'
  | 'close-share-modal'
  | 'close-hymn'
  | 'close-prayer'
  | 'clear-book-selection'
  | 'clear-search'
  | 'go-back-tab'
  | 'at-root';

/**
 * Decide what a single back press should do, given the current app state.
 * Pure and side-effect free so it can be unit-tested without touching
 * window/history — the stateful mechanics live in the hook below.
 */
export function resolveBackAction(s: BackButtonSnapshot): BackAction {
  if (s.reportTarget) return 'close-report';
  if (s.showShareModal) return 'close-share-modal';
  if (s.activeHymn) return 'close-hymn';
  if (s.activePrayer) return 'close-prayer';
  if (s.selectedBookId) return 'clear-book-selection';
  if (s.searchQuery.trim().length > 0) return 'clear-search';
  if (s.activeTab !== 'home') return 'go-back-tab';
  return 'at-root';
}

// How long a first back press at the root screen "arms" the exit prompt
// before it's forgotten and a fresh back press starts the warning over again.
const EXIT_ARM_WINDOW_MS = 2000;

// Caps the tab-visit stack so a long session of bouncing between tabs can't
// grow it without bound. Losing the oldest entries only affects how far back
// a very long chain of tab switches can be replayed — the common case (a
// handful of visits) is unaffected.
const MAX_TAB_STACK = 25;

type BackPhase = 'idle' | 'armed' | 'exiting';

export interface UseAndroidBackButtonArgs {
  snapshot: BackButtonSnapshot;
  closeReport: () => void;
  setShowShareModal: (show: boolean) => void;
  closeHymn: () => void;
  closePrayer: () => void;
  setSelectedBookId: (bookId: null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: AppTab) => void;
  setShowExitPrompt: (show: boolean) => void;
}

// True only for an installed, standalone-launched PWA — a plain browser tab
// (desktop or mobile) has its own real back button/gesture that must keep
// working normally, so this hook is a no-op everywhere else.
function isInstalledStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches === true;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

/**
 * Makes the Android hardware back button / edge swipe-back gesture navigate
 * back through the app's own screens instead of closing the installed PWA
 * (there is no native back-button API for a plain web app — this works by
 * keeping one synthetic history entry "pinned" so every back press reliably
 * fires `popstate` instead of letting the OS close the app before any JS
 * runs, then deciding what that press should do and re-arming the guard).
 *
 * On the true root screen (Home tab, nothing else open), the first press
 * shows an exit prompt instead of re-arming. A second press within
 * EXIT_ARM_WINDOW_MS is let through untouched (no re-push) and permanently
 * stops this hook from intercepting anything further — a plain web PWA has
 * no API to force-quit itself, so the best it can do is get out of the way
 * and let the platform's own back behaviour take over from there, which
 * exits once the underlying history is exhausted.
 */
export function useAndroidBackButton(args: UseAndroidBackButtonArgs): void {
  // Updated every render so the listener (subscribed once) never reads stale
  // context values without needing to re-subscribe on every state change.
  const latest = useRef(args);
  latest.current = args;

  // Computed once — display mode doesn't change over an app's lifetime.
  const standaloneRef = useRef<boolean | null>(null);
  if (standaloneRef.current === null) {
    standaloneRef.current = isInstalledStandaloneApp();
  }

  const phaseRef = useRef<BackPhase>('idle');
  const armTimeoutRef = useRef<number | undefined>(undefined);

  const isAtRoot = resolveBackAction(args.snapshot) === 'at-root';

  // Tab-visit stack, purely for back-navigation bookkeeping — nothing outside
  // this hook needs to read it, so it stays as internal refs rather than
  // context state. `isBackTabChangeRef` distinguishes a genuine tab click
  // (push onto the stack) from a change this hook itself made while popping
  // (skip pushing, or the stack would never shrink).
  const tabStackRef = useRef<AppTab[]>([args.snapshot.activeTab]);
  const isBackTabChangeRef = useRef(false);

  useEffect(() => {
    if (!standaloneRef.current) return;
    if (isBackTabChangeRef.current) {
      isBackTabChangeRef.current = false;
      return;
    }
    const stack = tabStackRef.current;
    if (stack[stack.length - 1] !== args.snapshot.activeTab) {
      stack.push(args.snapshot.activeTab);
      if (stack.length > MAX_TAB_STACK) stack.shift();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.snapshot.activeTab]);

  // The exit prompt only makes sense while genuinely at the root with
  // nothing else open. If the user leaves that state by any means OTHER
  // than a back press — tapping a bottom-nav tab, opening a hymn from the
  // home screen's "continue reading", etc. — disarm immediately rather than
  // leaving a stale "armed" flag that would make an unrelated later back
  // press at Home exit immediately instead of showing the prompt again.
  useEffect(() => {
    if (!isAtRoot && phaseRef.current === 'armed') {
      phaseRef.current = 'idle';
      window.clearTimeout(armTimeoutRef.current);
      args.setShowExitPrompt(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAtRoot]);

  useEffect(() => {
    if (!standaloneRef.current) return;

    history.pushState({ mhbGuard: true }, '', location.href);

    const onPopState = () => {
      if (phaseRef.current === 'exiting') return; // let every further press through, untouched

      const current = latest.current;
      const action = resolveBackAction(current.snapshot);

      if (action === 'at-root') {
        if (phaseRef.current === 'armed') {
          window.clearTimeout(armTimeoutRef.current);
          phaseRef.current = 'exiting';
          current.setShowExitPrompt(false);
          return; // Do not re-arm the guard — we're letting this exit through.
        }
        phaseRef.current = 'armed';
        current.setShowExitPrompt(true);
        armTimeoutRef.current = window.setTimeout(() => {
          phaseRef.current = 'idle';
          current.setShowExitPrompt(false);
        }, EXIT_ARM_WINDOW_MS);
      } else {
        switch (action) {
          case 'close-report':
            current.closeReport();
            break;
          case 'close-share-modal':
            current.setShowShareModal(false);
            break;
          case 'close-hymn':
            current.closeHymn();
            break;
          case 'close-prayer':
            current.closePrayer();
            break;
          case 'clear-book-selection':
            current.setSelectedBookId(null);
            break;
          case 'clear-search':
            current.setSearchQuery('');
            break;
          case 'go-back-tab': {
            const stack = tabStackRef.current;
            if (stack.length > 1) {
              stack.pop();
              const previous = stack[stack.length - 1];
              isBackTabChangeRef.current = true;
              current.setActiveTab(previous);
            } else {
              current.setActiveTab('home');
            }
            break;
          }
        }
      }

      history.pushState({ mhbGuard: true }, '', location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.clearTimeout(armTimeoutRef.current);
    };
  }, []);
}
