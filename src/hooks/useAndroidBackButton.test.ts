/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBackAction, type BackButtonSnapshot } from './useAndroidBackButton.js';

const base: BackButtonSnapshot = {
  reportTarget: null,
  showShareModal: false,
  activeHymn: null,
  activePrayer: null,
  selectedBookId: null,
  searchQuery: '',
  activeTab: 'home'
};

test('report sheet takes priority over everything else', () => {
  const s: BackButtonSnapshot = { ...base, reportTarget: {}, showShareModal: true, activeHymn: {} };
  assert.equal(resolveBackAction(s), 'close-report');
});

test('share modal beats the hymn overlay it sits on top of', () => {
  const s: BackButtonSnapshot = { ...base, showShareModal: true, activeHymn: {} };
  assert.equal(resolveBackAction(s), 'close-share-modal');
});

test('hymn overlay beats the prayer overlay', () => {
  const s: BackButtonSnapshot = { ...base, activeHymn: {}, activePrayer: {} };
  assert.equal(resolveBackAction(s), 'close-hymn');
});

test('prayer overlay beats an open book / active search', () => {
  const s: BackButtonSnapshot = { ...base, activePrayer: {}, selectedBookId: 'xhosa', searchQuery: 'amen' };
  assert.equal(resolveBackAction(s), 'close-prayer');
});

test('an open book beats an active search', () => {
  const s: BackButtonSnapshot = { ...base, selectedBookId: 'xhosa', searchQuery: 'amen' };
  assert.equal(resolveBackAction(s), 'clear-book-selection');
});

test('an active search is cleared when nothing deeper is open', () => {
  const s: BackButtonSnapshot = { ...base, searchQuery: 'amen' };
  assert.equal(resolveBackAction(s), 'clear-search');
});

test('a whitespace-only search does not count as active', () => {
  const s: BackButtonSnapshot = { ...base, searchQuery: '   ' };
  assert.equal(resolveBackAction(s), 'at-root');
});

test('a non-home tab with nothing else open steps back a tab', () => {
  const s: BackButtonSnapshot = { ...base, activeTab: 'settings' };
  assert.equal(resolveBackAction(s), 'go-back-tab');
});

test('the home tab with nothing else open is the true root', () => {
  assert.equal(resolveBackAction(base), 'at-root');
});
