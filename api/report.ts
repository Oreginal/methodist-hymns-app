/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vercel Function: receives a hymn issue report from the app and emails it.
 *
 * The app is otherwise a static SPA, so this is the only server-side code.
 * Configuration comes from env vars set on the Vercel project:
 *   RESEND_API_KEY   — provisioned by the Resend marketplace integration
 *   REPORT_TO_EMAIL  — where reports are delivered
 *   REPORT_FROM_EMAIL— verified Resend sender (defaults to Resend's onboarding domain)
 */

const REPORT_KINDS = [
  'missing-hymn',
  'wrong-lyrics',
  'wrong-translation',
  'wrong-details',
  'other'
] as const;
type ReportKind = (typeof REPORT_KINDS)[number];

const KIND_LABELS: Record<ReportKind, string> = {
  'missing-hymn': 'Missing hymn',
  'wrong-lyrics': 'Incorrect lyrics',
  'wrong-translation': 'Incorrect English translation',
  'wrong-details': 'Wrong number, title or details',
  other: 'Something else'
};

// Field caps. These are the last line of defence on a public, unauthenticated
// endpoint — the form enforces the same limits, but a client can be bypassed.
const LIMITS = { details: 4000, title: 200, email: 254, book: 40, appVersion: 40 };

interface ReportPayload {
  kind: ReportKind;
  details: string;
  bookId?: string;
  hymnNumber?: number;
  hymnTitle?: string;
  reporterEmail?: string;
  appVersion?: string;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

/** Trim, cap, and drop anything that is not a usable string. */
const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
};

/**
 * Escape for interpolation into the HTML email body. Report text is written by
 * anonymous members of the public, so it is never trusted as markup.
 */
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Strip anything that could inject a new header if a value reaches a header
 * field (subject, reply-to). CR/LF are the whole attack here.
 */
const headerSafe = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim();

const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function validate(raw: unknown): { report?: ReportPayload; error?: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Expected a JSON object.' };
  const body = raw as Record<string, unknown>;

  const kind = body.kind;
  if (typeof kind !== 'string' || !REPORT_KINDS.includes(kind as ReportKind)) {
    return { error: `"kind" must be one of: ${REPORT_KINDS.join(', ')}.` };
  }

  const details = clean(body.details, LIMITS.details);
  if (!details) return { error: 'Please describe the problem.' };

  const reporterEmail = clean(body.reporterEmail, LIMITS.email);
  if (reporterEmail && !isEmail(reporterEmail)) {
    return { error: 'That email address does not look valid.' };
  }

  let hymnNumber: number | undefined;
  if (body.hymnNumber !== undefined && body.hymnNumber !== null && body.hymnNumber !== '') {
    const n = Number(body.hymnNumber);
    if (!Number.isInteger(n) || n < 1 || n > 9999) {
      return { error: 'Hymn number must be a whole number between 1 and 9999.' };
    }
    hymnNumber = n;
  }

  return {
    report: {
      kind: kind as ReportKind,
      details,
      bookId: clean(body.bookId, LIMITS.book),
      hymnNumber,
      hymnTitle: clean(body.hymnTitle, LIMITS.title),
      reporterEmail,
      appVersion: clean(body.appVersion, LIMITS.appVersion)
    }
  };
}

function buildEmail(report: ReportPayload) {
  const label = KIND_LABELS[report.kind];
  const hymnRef = report.hymnNumber
    ? `${report.bookId ?? 'unknown book'} ${report.hymnNumber}${report.hymnTitle ? ` — ${report.hymnTitle}` : ''}`
    : report.hymnTitle ?? '(no hymn identified)';

  const subject = headerSafe(
    report.hymnNumber
      ? `[Hymn report] ${label} — ${report.bookId ?? '?'} ${report.hymnNumber}`
      : `[Hymn report] ${label}`
  );

  const rows: [string, string][] = [
    ['Type', label],
    ['Hymn', hymnRef],
    ['Reported by', report.reporterEmail ?? 'anonymous'],
    ['App version', report.appVersion ?? 'unknown'],
    ['Received', new Date().toISOString()]
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px">
      <h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(label)}</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px">${escapeHtml(hymnRef)}</p>
      <table style="border-collapse:collapse;font-size:13px;margin-bottom:16px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:2px 12px 2px 0;color:#888">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`
          )
          .join('')}
      </table>
      <div style="white-space:pre-wrap;background:#f6f6f6;border-radius:8px;padding:12px;font-size:14px;line-height:1.5">${escapeHtml(
        report.details
      )}</div>
    </div>`;

  const text = [
    label,
    hymnRef,
    ...rows.slice(2).map(([k, v]) => `${k}: ${v}`),
    '',
    report.details
  ].join('\n');

  return { subject, html, text };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REPORT_TO_EMAIL;
  // Resend's shared onboarding sender works before a custom domain is verified.
  const from = process.env.REPORT_FROM_EMAIL ?? 'Hymn Reports <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.error('Report endpoint is not configured (RESEND_API_KEY / REPORT_TO_EMAIL missing).');
    return json(503, { error: 'Reporting is not configured yet. Please try again later.' });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'Could not read the report.' });
  }

  const validated = validate(raw);
  if (validated.error || !validated.report) {
    return json(400, { error: validated.error ?? 'That report could not be read.' });
  }
  const report = validated.report;

  const { subject, html, text } = buildEmail(report);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        // Lets you reply straight to the member who reported it, when they left
        // an address. headerSafe() keeps CRLF out of the header.
        ...(report.reporterEmail
          ? { reply_to: headerSafe(report.reporterEmail) }
          : {})
      })
    });

    if (!res.ok) {
      // Never surface the provider's response to the client; it can carry
      // account details. Log it for the operator instead.
      console.error('Resend rejected the report email:', res.status, await res.text());
      return json(502, { error: 'Could not send the report. Please try again shortly.' });
    }
  } catch (err) {
    console.error('Failed to reach Resend:', err);
    return json(502, { error: 'Could not send the report. Please try again shortly.' });
  }

  return json(200, { ok: true });
}

// A GET is only ever a health/config probe — it must never send mail.
export async function GET(): Promise<Response> {
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.REPORT_TO_EMAIL);
  return json(200, { ok: true, configured });
}
