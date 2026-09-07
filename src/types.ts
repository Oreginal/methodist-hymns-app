/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BookId = 'xhosa' | 'setswana' | 'sesotho' | 'english';

export interface Book {
  id: BookId;
  name: string;
  nativeName: string;
  description: string;
  colorClass: string;
}

// A single lyric line. `primary` is the native (e.g. Xhosa) text; `translation`
// is the English gloss and is OMITTED entirely when the hymn has no translation
// for that line (never an empty string) so the UI renders no empty rows.
export interface HymnLine {
  primary: string;
  translation?: string;
}

export interface HymnVerse {
  number: number; // 1-based verse index
  lines: HymnLine[];
}

export interface Hymn {
  bookId: BookId;
  hymnNumber: number;
  hymnCode: string; // e.g. "X11", "E1"
  title: string;
  lyrics: string; // verses separated by newlines \n\n — kept for backward compat + search/share
  // Structured representation. Preferred source when present; absent on the
  // hardcoded fallback hymns (which still render via the `lyrics` string).
  verses?: HymnVerse[];
  hasTranslations?: boolean;
  amen?: boolean;
  reference?: string; // scripture reference, e.g. "Psalm 118"
  author?: string;
  category?: string;
}

export interface Prayer {
  id: string;
  category: 'Opening' | 'Morning' | 'Evening' | 'Thanksgiving' | 'Closing';
  title: string;
  content: string;
}

export interface RecentHymn {
  bookId: BookId;
  hymnNumber: number;
  title: string;
  viewedAt: string;
}

export interface Favourites {
  hymns: { bookId: BookId; hymnNumber: number }[];
  prayers: string[]; // prayer ids
}



// ---- Issue reporting ------------------------------------------------------
// Members can flag a hymn that is missing or wrong. Kinds are a closed set so
// the API can validate them and the email can be filed by type.
export type ReportKind =
  | 'missing-hymn'
  | 'wrong-lyrics'
  | 'wrong-translation'
  | 'wrong-details'
  | 'other';

// What the user was looking at when they tapped Report. `hymn` pre-fills the
// identity and is read-only in the form; `book` and `general` ask for it.
export interface ReportTarget {
  scope: 'hymn' | 'book' | 'general';
  bookId?: BookId;
  hymnNumber?: number;
  hymnTitle?: string;
  // Pre-selects a kind, e.g. opening the form from an empty search result
  // defaults to "missing hymn".
  suggestedKind?: ReportKind;
}

export interface IssueReport {
  kind: ReportKind;
  details: string;
  bookId?: string;
  hymnNumber?: number;
  hymnTitle?: string;
  reporterEmail?: string;
  appVersion?: string;
}

export type ReportSubmitState = 'idle' | 'sending' | 'sent' | 'queued' | 'error';
