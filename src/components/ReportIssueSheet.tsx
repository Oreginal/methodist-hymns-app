/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Send, WifiOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hymnBooks } from '../data/hymnsData';
import { BookId, ReportKind } from '../types';

const KIND_OPTIONS: { value: ReportKind; label: string; hint: string }[] = [
  { value: 'missing-hymn', label: 'Hymn is missing', hint: 'It should be in this book but isn’t.' },
  { value: 'wrong-lyrics', label: 'Lyrics are wrong', hint: 'A word, line or verse is incorrect.' },
  { value: 'wrong-translation', label: 'Translation is wrong', hint: 'The English under the lyrics is off.' },
  { value: 'wrong-details', label: 'Number or title is wrong', hint: 'Wrong hymn number, title or book.' },
  { value: 'other', label: 'Something else', hint: '' }
];

const DETAILS_MAX = 4000;

/**
 * Bottom sheet (mobile) / centred dialog (tablet and up) for reporting a hymn
 * that is missing or incorrect. Opened from anywhere via `openReport()`.
 */
export const ReportIssueSheet: React.FC = () => {
  const {
    reportTarget,
    closeReport,
    submitReport,
    reportState,
    reportError,
    currentUser
  } = useApp();

  const [kind, setKind] = useState<ReportKind>('wrong-lyrics');
  const [details, setDetails] = useState('');
  const [bookId, setBookId] = useState<BookId>('xhosa');
  const [hymnNumber, setHymnNumber] = useState('');
  const [hymnTitle, setHymnTitle] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // A hymn-scoped report already knows what it is about, so the identity is
  // shown as a read-only summary instead of asked for again.
  const hymnKnown = reportTarget?.scope === 'hymn' && reportTarget.hymnNumber !== undefined;

  // Seed the form each time the sheet opens.
  useEffect(() => {
    if (!reportTarget) return;
    setKind(reportTarget.suggestedKind ?? (reportTarget.scope === 'hymn' ? 'wrong-lyrics' : 'missing-hymn'));
    setDetails('');
    setTouched(false);
    setBookId(reportTarget.bookId ?? 'xhosa');
    setHymnNumber(reportTarget.hymnNumber !== undefined ? String(reportTarget.hymnNumber) : '');
    setHymnTitle(reportTarget.hymnTitle ?? '');
    // Signed-in members get their address pre-filled so a reply is possible.
    setReporterEmail(currentUser && !currentUser.isGuest ? currentUser.email : '');
  }, [reportTarget, currentUser]);

  // Close on Escape, and keep focus inside the sheet while it is open.
  useEffect(() => {
    if (!reportTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReport();
    };
    document.addEventListener('keydown', onKeyDown);
    // Lock the page behind the sheet so iOS does not scroll the list underneath.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [reportTarget, closeReport]);

  const bookName = useMemo(
    () => hymnBooks.find(b => b.id === bookId)?.name ?? bookId,
    [bookId]
  );

  if (!reportTarget) return null;

  const detailsMissing = details.trim().length === 0;
  const isSending = reportState === 'sending';
  const isDone = reportState === 'sent' || reportState === 'queued';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (detailsMissing || isSending) {
      detailsRef.current?.focus();
      return;
    }
    submitReport({
      kind,
      details: details.trim(),
      bookId,
      hymnNumber: hymnNumber ? Number(hymnNumber) : undefined,
      hymnTitle: hymnTitle.trim() || undefined,
      reporterEmail: reporterEmail.trim() || undefined,
      appVersion: __APP_VERSION__
    });
  };

  const fieldClass =
    'w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 ' +
    'px-3.5 py-3 text-base text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 focus:border-[#E53935] transition';
  const labelClass =
    'block text-[11px] font-bold uppercase tracking-wider text-[#757575] dark:text-zinc-400 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in"
      onClick={closeReport}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sheet-title"
        onClick={e => e.stopPropagation()}
        className={
          // Mobile: full-width bottom sheet that never exceeds the viewport and
          // clears the iOS home indicator. Tablet+: centred card.
          'w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl ' +
          'rounded-t-3xl sm:rounded-2xl border-t sm:border border-gray-100 dark:border-zinc-800 ' +
          'max-h-[92dvh] sm:max-h-[88dvh] flex flex-col animate-slide-up sm:animate-scale-up'
        }
      >
        {/* Grab handle — the affordance that says "this sheet can be dismissed" */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-700" />
        </div>

        <header className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="report-sheet-title"
              className="text-lg font-bold text-gray-900 dark:text-white leading-tight"
            >
              {isDone ? 'Thank you' : 'Report a problem'}
            </h2>
            {!isDone && (
              <p className="text-xs text-[#757575] dark:text-zinc-400 mt-0.5 leading-snug">
                {hymnKnown
                  ? 'Tell us what’s wrong with this hymn.'
                  : 'Tell us what’s missing or wrong and we’ll fix it.'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closeReport}
            aria-label="Close"
            className="shrink-0 h-10 w-10 -mr-1 -mt-1 flex items-center justify-center rounded-full text-[#757575] dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-90 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {isDone ? (
          /* ---- Confirmation ------------------------------------------- */
          <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
            <div
              className={`flex gap-3 rounded-xl p-4 ${
                reportState === 'sent'
                  ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300'
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
              }`}
            >
              {reportState === 'sent' ? (
                <Check size={18} className="shrink-0 mt-0.5" />
              ) : (
                <WifiOff size={18} className="shrink-0 mt-0.5" />
              )}
              <p className="text-sm leading-relaxed">
                {reportState === 'sent'
                  ? 'Your report has been sent. We’ll review it and correct the hymn book.'
                  : 'We’ve saved your report — it couldn’t be sent just yet. It will go automatically as soon as there’s a connection, so you can close the app safely.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeReport}
              className="w-full h-12 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* ---- Form ---------------------------------------------------- */
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="px-5 pb-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* What kind of problem — chips wrap, each is a full tap target */}
              <fieldset>
                <legend className={labelClass}>What’s wrong?</legend>
                <div className="flex flex-wrap gap-2">
                  {KIND_OPTIONS.map(option => {
                    const selected = kind === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKind(option.value)}
                        aria-pressed={selected}
                        className={`min-h-[44px] px-3.5 rounded-xl border text-sm font-semibold transition active:scale-95 cursor-pointer ${
                          selected
                            ? 'border-[#E53935] bg-red-50 dark:bg-red-950/30 text-[#E53935]'
                            : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Which hymn */}
              {hymnKnown ? (
                <div className="rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3.5 py-3">
                  <p className={labelClass + ' mb-1'}>Hymn</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-snug">
                    {bookName} · {hymnNumber}
                  </p>
                  {hymnTitle && (
                    <p className="text-xs text-[#757575] dark:text-zinc-400 mt-0.5 leading-snug break-words">
                      {hymnTitle}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="report-book" className={labelClass}>Hymn book</label>
                    <div className="relative">
                      <select
                        id="report-book"
                        value={bookId}
                        onChange={e => setBookId(e.target.value as BookId)}
                        className={fieldClass + ' appearance-none pr-10'}
                      >
                        {hymnBooks.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label htmlFor="report-number" className={labelClass}>Number</label>
                      <input
                        id="report-number"
                        // inputMode numeric brings up the number pad without the
                        // spinner arrows and quirky validation of type="number".
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="41"
                        value={hymnNumber}
                        onChange={e => setHymnNumber(e.target.value.replace(/\D/g, ''))}
                        className={fieldClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="report-title" className={labelClass}>
                        Title <span className="font-medium normal-case tracking-normal">(if known)</span>
                      </label>
                      <input
                        id="report-title"
                        maxLength={200}
                        placeholder="Masibulele kuYesu"
                        value={hymnTitle}
                        onChange={e => setHymnTitle(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Details */}
              <div>
                <label htmlFor="report-details" className={labelClass}>Details</label>
                <textarea
                  id="report-details"
                  ref={detailsRef}
                  rows={4}
                  maxLength={DETAILS_MAX}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={touched && detailsMissing}
                  aria-describedby="report-details-help"
                  placeholder={
                    kind === 'missing-hymn'
                      ? 'e.g. Hymn 88 “Ndikhokele” is not in the Xhosa book.'
                      : 'e.g. Verse 2, line 3 should read “Ngokusifela kwaKhe”.'
                  }
                  className={fieldClass + ' resize-none leading-relaxed'}
                />
                <div className="flex items-start justify-between gap-3 mt-1.5">
                  <p
                    id="report-details-help"
                    className={`text-xs leading-snug ${
                      touched && detailsMissing
                        ? 'text-[#E53935] font-semibold'
                        : 'text-[#757575] dark:text-zinc-400'
                    }`}
                  >
                    {touched && detailsMissing
                      ? 'Please describe the problem so we can find it.'
                      : 'The more specific, the faster we can fix it.'}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-zinc-500">
                    {details.length}/{DETAILS_MAX}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div>
                <label htmlFor="report-email" className={labelClass}>
                  Your email <span className="font-medium normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="report-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="So we can follow up"
                  value={reporterEmail}
                  onChange={e => setReporterEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {reportState === 'error' && reportError && (
                <div
                  role="alert"
                  className="flex gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 p-3.5 text-sm text-red-800 dark:text-red-300"
                >
                  <AlertCircle size={17} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{reportError}</span>
                </div>
              )}
            </div>

            {/* Sticky action bar so Send is always reachable on a small screen */}
            <div className="shrink-0 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] rounded-b-none sm:rounded-b-2xl">
              <button
                type="submit"
                disabled={isSending}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#E53935] hover:bg-[#c62828] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-[0.99] transition cursor-pointer"
              >
                {isSending ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Send report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
