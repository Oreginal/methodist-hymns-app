/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { spawnSync } from 'child_process';

// Root-level directory configuration
const RAW_INPUT_DIR = path.join(process.cwd(), 'import-source');
const CONVERTED_INPUT_DIR = path.join(process.cwd(), 'import-source-converted');
const OUTPUT_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const REPORT_PATH = path.join(process.cwd(), 'import-report.json');
const REVIEW_PATH = path.join(process.cwd(), 'manual-review.json');

export type BookId = 'xhosa' | 'english' | 'setswana' | 'sesotho';
const BOOK_IDS: BookId[] = ['xhosa', 'english', 'setswana', 'sesotho'];

// Per-book output file, e.g. public/data/xhosa.json.
const outputPathForBook = (bookId: BookId) => path.join(OUTPUT_DATA_DIR, `${bookId}.json`);

// Structured line/verse shapes (mirror HymnLine / HymnVerse in src/types.ts).
interface ParsedLine {
  primary: string;
  translation?: string;
}
interface ParsedVerse {
  number: number;
  lines: ParsedLine[];
}

// Interface for parsed internal structure
interface ParsedHymn {
  bookId: BookId;
  hymnNumber: number;
  hymnCode: string;
  title: string;
  lyrics: string; // Combined formatted lyrics (kept for backward compat + search/share)
  verses: ParsedVerse[]; // Structured primary source
  hasTranslations: boolean;
  author?: string;
  category?: string;
  scripture?: string;
  hasAmen: boolean;
  filename: string;
  // Which mechanism decided what counted as English. 'markers' means the deck
  // carried explicit [ENG]…[/ENG] wrappers and NO guessing was involved.
  englishSource: 'markers' | 'heuristic';
  markerIssues: MarkerIssues;
  // The leading line dropped as an English title, if any — surfaced so a
  // destructive rule can be reviewed instead of silently deleting a lyric.
  droppedEnglishTitle?: string;
}

// A single visual line of a slide, tagged with whether it sits inside an
// explicit [ENG]…[/ENG] region.
export interface SlideLine {
  text: string;
  isEnglish: boolean;
}

export interface MarkerIssues {
  unterminated: number; // [ENG] never closed before the end of the slide
  strayClose: number;   // [/ENG] with no open region
  nestedOpen: number;   // [ENG] encountered while a region was already open
  degenerate: number;   // marked region holding no actual word (see below)
}

export interface MarkerScan extends MarkerIssues {
  lines: SlideLine[];
  markerCount: number; // total marker tokens seen (0 => unmarked deck)
}

// Set of common English words for translation identification
const ENGLISH_WORD_SET = new Set([
  'the', 'to', 'and', 'of', 'for', 'on', 'with', 'in', 'by', 'is', 'am', 'are', 'was', 'were',
  'my', 'our', 'your', 'his', 'her', 'their', 'us', 'we', 'you', 'me', 'it', 'them',
  'lord', 'god', 'jesus', 'christ', 'savior', 'saviour', 'redeemer', 'king', 'grace', 'glory',
  'glorious', 'holy', 'spirit', 'ghost', 'heart', 'voice', 'heaven', 'earth', 'sing', 'praise',
  'thanks', 'give', 'come', 'go', 'will', 'thy', 'thine', 'thou', 'thee', 'o', 'father', 'son',
  'mercy', 'love', 'bless', 'praising', 'beloved', 'hymn', 'verse', 'amen',
  // Content words added to catch English lines the liturgical-only set missed
  // (whole-token matches, so long Xhosa words do not collide). See parser tests.
  'shall', 'not', 'fear', 'what', 'can', 'mere', 'mortals', 'do', 'over', 'those', 'who',
  'hate', 'triumph', 'find', 'refuge', 'him', 'than', 'trust', 'humankind', 'all', 'let',
  'congregation', 'israel', 'say', 'rescued', 'answered', 'salvation', 'rest', 'help',
  'prayed', 'distress', 'right', 'thing', 'kind', 'kindly', 'endures', 'forever', 'good', 'he',
  'among', 'other', 'gods', 'none', 'like', 'there', 'gladsome', 'mind', 'let', 'us'
]);

// Set of common scripture books to identify references
const SCRIPTURE_BOOKS_REGEX = /(?:Indumiso|INdumiso|Psalm|Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mateyu|Mark|Luke|Luka|John|Yohane|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Timothy|Titus|Hebrews|James|Yakobi|Peter|Petros|Jude|Yuda|Revelation|Sityhilelo)/i;

// Scripture REFERENCE matcher: a book name from the alternation above, immediately
// followed by a REQUIRED chapter number, with an optional ":verse" and verse range.
// Unlike SCRIPTURE_BOOKS_REGEX (book name anywhere on the line), this refuses to
// match lyric lines that merely contain a book token (e.g. "Ma siyenze indumiso").
// Range char class includes hyphen, en-dash (–) and em-dash (—). Used with .match()
// so we can store ONLY the matched reference substring, not the whole line.
const SCRIPTURE_REFERENCE_REGEX = /\b(?:Indumiso|INdumiso|Psalm|Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mateyu|Mark|Luke|Luka|John|Yohane|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Timothy|Titus|Hebrews|James|Yakobi|Peter|Petros|Jude|Yuda|Revelation|Sityhilelo)\.?\s+\d{1,3}(?:\s*[:.]\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)?\b/i;

/**
 * Clean and decode XML entities in slide strings.
 */
function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, '’')
    .replace(/&#x2018;/g, '‘')
    .replace(/&#39;/g, "'")
    .replace(/&#160;/g, ' ')
    // Decode any remaining numeric entities (hex then decimal), e.g. &#9; (tab),
    // so tab-only paragraphs collapse away and "&#9;...AMEN" becomes "AMEN".
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects if a paragraph line should be flagged as English translation.
 */
export function isEnglishLine(line: string): boolean {
  const clean = line.toLowerCase().replace(/[^a-z\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return false;

  // Lines enclosed in parentheses or brackets are often translation guides
  if (line.startsWith('(') && line.endsWith(')')) return true;
  if (line.startsWith('[') && line.endsWith(']')) return true;

  // Multi-word matches against the English reference word bank
  let englishWordCount = 0;
  for (const word of words) {
    if (ENGLISH_WORD_SET.has(word)) {
      englishWordCount++;
    }
  }

  // If more than 35% of the words are common English words, or >= 2 strong matches
  const ratio = englishWordCount / words.length;
  return ratio > 0.35 || englishWordCount >= 2;
}

/**
 * Generate mock slides for local development & validation if folder is empty.
 */
function generateMockPowerPoints() {
  console.log('No PowerPoint inputs found. Generating mock sample files in:', RAW_INPUT_DIR);
  fs.mkdirSync(RAW_INPUT_DIR, { recursive: true });

  // XML template helper for PPTX slides text contents
  const makeSlideXml = (paragraphs: string[]) => {
    const ps = paragraphs.map(p => `
      <a:p>
        <a:pPr lMar="0" indent="0" align="ctr"/>
        <a:r>
          <a:rPr lang="en-US" sz="3200"/>
          <a:t>${p}</a:t>
        </a:r>
      </a:p>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:bodyPr/>
              <a:lstStyle/>
              ${ps}
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;
  };

  /**
   * Helper to write a zip-based .pptx file structure containing slides
   */
  const writeMockPptx = (filename: string, slides: string[][]) => {
    const zip = new AdmZip();
    slides.forEach((slideParagraphs, idx) => {
      zip.addFile(`ppt/slides/slide${idx + 1}.xml`, Buffer.from(makeSlideXml(slideParagraphs), 'utf8'));
    });
    zip.writeZip(path.join(RAW_INPUT_DIR, filename));
    console.log(`Created mock slide file: ${filename}`);
  };

  // 1. Xhosa Hymn sample
  writeMockPptx('X011 Bulelani kuYehova.pptx', [
    // Slide 1: Title and Header Info
    ['Amaculo Ase-Methodist', 'HYMN X11', 'Bulelani kuYehova', 'Indumiso 100 : 1 - 4'],
    // Slide 2: Verse 1
    ['Bulelani kuYehova,', 'Ngokuba elungile,', 'Amanabakhulu akhe,', 'Nenceba yakhe ihleli.'],
    // Slide 3: Verse 2 (with English translations mixed)
    ['Bulelani kuThixo,', '(Give thanks to God,)', 'Ophakamileyo kubo bonke,', '(Who is exalted above all,)'],
    // Slide 4: Verse 3 + Amen
    ['Yena yedwa owenza,', 'Imimangaliso emikhulu,', 'Kuba inceba yakhe ihleli.', 'AMEN, AMENE.']
  ]);

  // 2. English hymn sample
  writeMockPptx('E001 O for a thousand tongues.pptx', [
    ['Methodist Hymn Book 1', 'O For A Thousand Tongues To Sing', 'By Charles Wesley'],
    ['1', 'O for a thousand tongues to sing', 'My great Redeemer’s praise,', 'The glories of my God and King,', 'The triumphs of His grace!'],
    ['2', 'My gracious Master and my God,', 'Assist me to proclaim,', 'To spread through all the earth abroad', 'The honors of Thy name.']
  ]);

  // 3. Setswana hymn sample
  writeMockPptx('S005 Re a go baka.pptx', [
    ['Sefela Sa-Methodist', 'Hymn 5', 'Re a go baka', 'Pesalema 95'],
    ['Ke tla go baka, Morena,', '(I will praise you, Lord,)', 'Ka pelo ya me yotlhe,', '(With all my heart.)', 'AMEN.']
  ]);

  // 4. A dummy older legacy PPT file to show trigger review
  fs.writeFileSync(path.join(RAW_INPUT_DIR, 'X012 Older Format.ppt'), 'Dummy Binary Content');
  console.log('Created dummy legacy file: X012 Older Format.ppt');
}

/**
 * Extracts elements from XML ppt/slides/slide*.xml
 */
export function extractTextFromSlideXml(xmlContent: string): string[] {
  const paragraphs: string[] = [];
  
  // Extract paragraph blocks <a:p>
  const paragraphRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
    // LibreOffice encodes soft line breaks as <a:br/> INSIDE a single <a:p>,
    // so an entire multi-line verse can live in one paragraph. Split on <a:br/>
    // first, so each visual line becomes its own entry (otherwise verses
    // collapse into one concatenated blob).
    const segments = pMatch[1].split(/<a:br\b[^>]*?\/?>(?:<\/a:br>)?/i);

    for (const segment of segments) {
      // Within each segment, extract text blocks <a:t>
      const textRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
      let tMatch: RegExpExecArray | null;
      let segmentString = '';

      while ((tMatch = textRegex.exec(segment)) !== null) {
        segmentString += tMatch[1];
      }

      const decoded = decodeXmlEntities(segmentString);
      if (decoded.length > 0) {
        paragraphs.push(decoded);
      }
    }
  }

  return paragraphs;
}

// Matches an [ENG] / [/ENG] marker token. Tolerant of internal whitespace and
// case ("[ eng ]", "[/ Eng ]") because the markers were injected into live
// PowerPoint runs and stray spaces are common around them.
const ENG_TOKEN = /\[[ \t]*(\/?)[ \t]*ENG[ \t]*\]/gi;

// A balanced marked region and its contents, used to strip degenerate regions
// before the state machine runs.
const ENG_PAIR = /\[[ \t]*ENG[ \t]*\]((?:(?!\[[ \t]*\/?[ \t]*ENG[ \t]*\])[\s\S])*)\[[ \t]*\/[ \t]*ENG[ \t]*\]/gi;

// A translation contains at least one word. The colour pass wrapped EVERY red
// run, and hymn decks use red for non-linguistic marks too: single drop-cap or
// page-marker letters ("[ENG]T[/ENG]") and Sesotho chant-pointing pipes
// ("ma [ENG]|[/ENG]holimong,"). Those are not English — and treating them as a
// region would split a word across two lines — so a region with no 2+ letter
// word is spliced back inline as native text.
const REGION_HAS_WORD = /[A-Za-z\u00C0-\u024F]{2,}/;

/**
 * Split a whole slide's text into native / English segments using the explicit
 * [ENG]…[/ENG] markers written by the colour-analysis pre-processing pass.
 *
 * This deliberately runs over the slide as ONE character stream rather than
 * line by line. The markers were inserted per PowerPoint formatting *run*, and
 * a run routinely swallows the trailing paragraph mark, so the real converted
 * decks contain lines such as:
 *
 *   "[ENG]When I’m troubled from within"
 *   "[/ENG]Ke bitsa ho uena;"
 *
 * A line-oriented parser would mark that second (native Sesotho) line as
 * English. Working on the character stream puts the region boundary exactly
 * where the marker is, so the native remainder of the line stays native.
 *
 * Recovery rules — a malformed deck is flagged, never silently corrupted:
 *  - an unterminated [ENG] closes at the end of the slide
 *  - a stray [/ENG] with no open region is dropped
 *  - a nested [ENG] inside an open region is ignored (the region stays open)
 */
export function splitEnglishMarkers(slideText: string): MarkerScan {
  const lines: SlideLine[] = [];
  let unterminated = 0;
  let strayClose = 0;
  let nestedOpen = 0;
  let markerCount = 0;
  let degenerate = 0;

  // Pre-pass: unwrap degenerate regions so their glyph stays inline and the
  // line it sits in is never torn in two.
  slideText = slideText.replace(ENG_PAIR, (whole, inner: string) => {
    if (REGION_HAS_WORD.test(inner)) return whole;
    degenerate++;
    markerCount += 2;
    return inner;
  });

  // Push a raw segment, re-splitting it on newlines so each visual line becomes
  // its own entry. Whitespace-only fragments (e.g. the " " run trailing a
  // "[/ENG]") are dropped so they never become empty lyric lines.
  const pushSegment = (segment: string, isEnglish: boolean) => {
    for (const part of segment.split('\n')) {
      const text = part.trim();
      if (text.length > 0) lines.push({ text, isEnglish });
    }
  };

  // Text accumulated for the segment currently being built. Accumulating (rather
  // than slicing between marker offsets) is what lets a malformed token simply
  // be deleted while the surrounding text stays one contiguous line.
  let buffer = '';
  let inEnglish = false;
  let cursor = 0;

  ENG_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENG_TOKEN.exec(slideText)) !== null) {
    markerCount++;
    const isClosing = match[1] === '/';

    buffer += slideText.slice(cursor, match.index);
    cursor = ENG_TOKEN.lastIndex;

    if (!isClosing) {
      if (inEnglish) {
        // Nested open: drop the token and keep the outer region open.
        nestedOpen++;
        continue;
      }
      pushSegment(buffer, false);
      buffer = '';
      inEnglish = true;
    } else {
      if (!inEnglish) {
        // Stray close: drop the token; the text around it stays native.
        strayClose++;
        continue;
      }
      pushSegment(buffer, true);
      buffer = '';
      inEnglish = false;
    }
  }

  // Tail after the last marker. An unterminated region closes at the end of the
  // slide, which keeps the English text (rather than dropping or misfiling it)
  // while the warning tells a human to check the deck.
  buffer += slideText.slice(cursor);
  if (inEnglish) unterminated++;
  pushSegment(buffer, inEnglish);

  return { lines, unterminated, strayClose, nestedOpen, degenerate, markerCount };
}

/**
 * Turn the raw per-slide paragraph list into marker-resolved slide lines.
 * Joining with "\n" first is what lets a marker pair span paragraphs.
 */
function scanSlide(rawLines: string[]): MarkerScan {
  return splitEnglishMarkers(rawLines.join('\n'));
}

/**
 * Compute the manual-review validation warnings for a parsed hymn. Extracted so
 * the SAME logic drives both the per-file manual-review push and the dedup score,
 * keeping them consistent.
 */
function computeWarnings(parsed: ParsedHymn): string[] {
  const warnings: string[] = [];
  if (!parsed.hasAmen) {
    warnings.push('No "AMEN" statement was detected at terminal slides.');
  }
  if (parsed.lyrics.length < 30) {
    warnings.push('Lyrics text content matches lower than typical density limits (< 30 characters).');
  }
  if (!parsed.scripture) {
    warnings.push('Unable to detect scripture reference pattern.');
  }
  // The word-list check below is only meaningful for heuristic decks. In marker
  // mode the deck states what is English, so re-guessing would only add noise.
  if (parsed.hasTranslations && parsed.englishSource === 'heuristic') {
    const strayEnglish = parsed.verses.flatMap(v => v.lines).filter(l => isEnglishLine(l.primary)).length;
    if (strayEnglish > 0) {
      warnings.push(`${strayEnglish} line(s) detected as English in the primary (native) position — bilingual pairing may need manual review.`);
    }
  }

  const { unterminated, strayClose, nestedOpen, degenerate } = parsed.markerIssues;
  if (unterminated > 0) {
    warnings.push(`${unterminated} unterminated [ENG] marker(s) — the region was closed at the end of its slide; verify where the English actually ends.`);
  }
  if (strayClose > 0) {
    warnings.push(`${strayClose} stray [/ENG] marker(s) with no matching [ENG] — the token was dropped and the text kept as native.`);
  }
  if (nestedOpen > 0) {
    warnings.push(`${nestedOpen} nested [ENG] marker(s) inside an open region — ignored; verify the English boundaries.`);
  }
  if (degenerate > 0) {
    warnings.push(`${degenerate} marked region(s) contained no word (a red glyph or pointing mark, not a translation) — kept inline as native text.`);
  }
  if (parsed.englishSource === 'markers' && !parsed.hasTranslations) {
    warnings.push('Deck carries [ENG] markers but no translation pair was formed — check the slide structure.');
  }
  if (parsed.droppedEnglishTitle) {
    warnings.push(`Dropped a leading line as an English title: ${JSON.stringify(parsed.droppedEnglishTitle)}.`);
  }
  return warnings;
}

/**
 * Resolve the book/number/title identity from a deck's filename.
 *
 * Three naming conventions exist across the source corpus, so patterns are
 * tried in order:
 *   1. "X011 Bulelani kuYehova"     — letter code + number (Xhosa decks)
 *   2. "1 Mphe maleme a sekete"     — bare leading number (Sesotho decks)
 *   3. "Ao! Morena wa kagiso"       — no number at all (most Setswana decks);
 *                                     the number is harvested from the slide
 *                                     header instead (see parsePptx).
 *
 * `defaultBookId` comes from the --book flag and supplies the book for forms
 * 2 and 3, which carry no letter code. A letter code always wins over it.
 */
export function resolveIdentityFromFilename(
  fileBasename: string,
  defaultBookId: BookId
): { bookId: BookId; bookCode: string; hymnNumber: number | null; title: string } {
  const cleanTitle = (s: string) =>
    s.replace(/^[\s.,;:_\-·•]+/, '').replace(/\s+/g, ' ').trim();

  // Form 1: letter code + number.
  const lettered = fileBasename.match(/^([A-Za-z]+)\s*(\d+)\s*(.*)$/);
  if (lettered) {
    const bookCode = lettered[1];
    const codeLower = bookCode.toLowerCase();
    // NOTE: 's' is genuinely ambiguous between Setswana and Sesotho. It defers
    // to --book when that names one of them, else keeps the historical
    // 'setswana' default. (The previous mapping tested 's' twice, which made
    // the sesotho branch unreachable dead code.)
    let bookId: BookId;
    if (codeLower === 'x') bookId = 'xhosa';
    else if (codeLower === 'e') bookId = 'english';
    else if (codeLower === 't') bookId = 'setswana';
    else if (codeLower === 'so' || codeLower === 'd' || codeLower === 'l') bookId = 'sesotho';
    else if (codeLower === 's') {
      bookId = defaultBookId === 'sesotho' || defaultBookId === 'setswana' ? defaultBookId : 'setswana';
    } else bookId = defaultBookId;

    return { bookId, bookCode, hymnNumber: parseInt(lettered[2], 10), title: cleanTitle(lettered[3]) };
  }

  // Form 2: bare leading number. Book identity comes from --book / the batch.
  const numbered = fileBasename.match(/^(\d+)\s+(.*)$/);
  if (numbered) {
    return {
      bookId: defaultBookId,
      bookCode: bookCodeFor(defaultBookId),
      hymnNumber: parseInt(numbered[1], 10),
      title: cleanTitle(numbered[2])
    };
  }

  // Form 3: no number in the filename — caller must harvest it from the deck.
  return {
    bookId: defaultBookId,
    bookCode: bookCodeFor(defaultBookId),
    hymnNumber: null,
    title: cleanTitle(fileBasename)
  };
}

const bookCodeFor = (bookId: BookId): string =>
  bookId === 'xhosa' ? 'X' : bookId === 'english' ? 'E' : bookId === 'setswana' ? 'T' : 'SO';

// A header line that carries the hymn number, e.g. "TSWANA 397", "XHOSA 11",
// "HYMN 5". Shared by the metadata stripper and the number harvester so the two
// can never disagree about what counts as a header.
const isHeaderLine = (line: string): boolean => {
  if (/^[A-Za-z]{1,12}\.?\s+\d{1,4}\.?$/.test(line)) return true;
  if (/^(hymn|amaculo|sefela|difela|methodist)\b/i.test(line) && /\d/.test(line)) return true;
  return false;
};

/**
 * The main parser routine for a single PPTX file
 */
function parsePptx(filePath: string, defaultBookId: BookId = 'xhosa'): ParsedHymn {
  const filename = path.basename(filePath);
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();

  // Find all slide items
  const slideEntries = zipEntries.filter(entry => 
    /ppt\/slides\/slide\d+\.xml/i.test(entry.entryName)
  );

  // Sort them numerically by slide number
  slideEntries.sort((a, b) => {
    const numA = parseInt((a.entryName.match(/\d+/) || ['0'])[0], 10);
    const numB = parseInt((b.entryName.match(/\d+/) || ['0'])[0], 10);
    return numA - numB;
  });

  if (slideEntries.length === 0) {
    throw new Error('No slide elements found in .pptx zip structure');
  }

  // Parse slide text, then resolve the explicit [ENG] markers over each slide's
  // full character stream. `slidesText` keeps the raw (still-marked) lines so
  // the unmarked heuristic path can fall back to exactly its old input.
  const slidesText: string[][] = slideEntries.map(entry => {
    const xmlContent = entry.getData().toString('utf8');
    return extractTextFromSlideXml(xmlContent);
  });
  const scans: MarkerScan[] = slidesText.map(scanSlide);

  // MARKER MODE: the deck carries explicit [ENG]…[/ENG] wrappers, so English is
  // known, not guessed. The word-list heuristic is never consulted for pairing.
  // Decks with no markers keep the original heuristic behaviour untouched.
  const markerMode = scans.some(s => s.markerCount > 0 && s.lines.some(l => l.isEnglish));
  const markerIssues: MarkerIssues = {
    unterminated: scans.reduce((n, s) => n + s.unterminated, 0),
    strayClose: scans.reduce((n, s) => n + s.strayClose, 0),
    nestedOpen: scans.reduce((n, s) => n + s.nestedOpen, 0),
    degenerate: scans.reduce((n, s) => n + s.degenerate, 0)
  };

  // Slide lines to actually walk. Marker TEXT is always stripped — even for a
  // deck whose only marked runs were glyphs, which falls back to the heuristic
  // but must still never carry "[ENG]" into the output. Only the isEnglish
  // FLAGS are gated on marker mode, so the heuristic path sees the same
  // all-native input it always did.
  const slidesLines: SlideLine[][] = scans.map(scan =>
    scan.lines.map(l => ({ text: l.text, isEnglish: markerMode && l.isEnglish }))
  );

  // Extract Details from filename
  // Expect "X011 Bulelani kuYehova", "1 Mphe maleme a sekete", or an unnumbered
  // name whose number is harvested from the slide header below.
  const fileBasename = path.basename(filePath, path.extname(filePath));
  const identity = resolveIdentityFromFilename(fileBasename, defaultBookId);
  const bookId = identity.bookId;
  const bookCode = identity.bookCode;
  const cleanedTitle = identity.title;

  // No number in the filename (most Setswana decks): harvest it from the deck's
  // own header line, e.g. slide 1 opening "TSWANA 397". A number is never
  // invented — an unresolvable deck is rejected so it cannot collide with a
  // real record, and the caller routes it to manual review.
  let hymnNum = identity.hymnNumber;
  if (hymnNum === null) {
    for (const slideLines of slidesLines) {
      const header = slideLines.find(l => isHeaderLine(l.text));
      if (header) {
        const digits = header.text.match(/\d{1,4}/);
        if (digits) { hymnNum = parseInt(digits[0], 10); break; }
      }
    }
  }
  if (hymnNum === null) {
    throw new Error(
      'No hymn number in filename or slide header — cannot assign an identity. ' +
      'Rename the file with a leading number (e.g. "397 Ao! Morena wa kagiso.ppt") ' +
      'or add a "<BOOK> <number>" header slide.'
    );
  }

  // State caches for scanning metadata
  let author: string | undefined;
  let scripture: string | undefined;
  let category: string | undefined;
  let hasAmen = false;
  let droppedEnglishTitle: string | undefined;

  // Helpers for classifying individual lines while scanning every slide.
  // Slide 1 in these decks mixes a header + scripture reference with the
  // FIRST verse, so we must NOT discard the whole slide (that caused the
  // off-by-one where verse 1 went missing). Instead we strip metadata lines
  // in place and keep whatever lyric lines remain.
  // (isHeaderLine lives at module scope — it is shared with the hymn-number
  // harvester above so both agree on what a header line looks like.)
  const isAuthorLine = (line: string): boolean => {
    // Must be a genuine attribution, not a lyric line that merely contains "by"
    // (e.g. "Were crafted by You" must NOT be treated as an author). Accept a
    // leading "By <Name>", a known author keyword, or an initialed name ("C. Wesley").
    return /^by\s+[A-Za-z]/i.test(line) || /wesley/i.test(line) || /traditional/i.test(line) || /^[A-Z]\.\s*[A-Za-z]+/.test(line);
  };
  const cleanScripture = (line: string): string =>
    line.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, '').replace(/\s+/g, ' ').trim();

  // An English TITLE line shown above the Xhosa (e.g. "Once in Royal David City").
  // These translated-hymn titles are pure-ASCII Title Case with an English word,
  // which `isEnglishLine` misses (proper nouns aren't in the word set). Used only
  // for the first lyric line, so a rare misfire only affects one line.
  const looksLikeEnglishTitle = (line: string): boolean => {
    if (isEnglishLine(line)) return true;
    if (!/^[\x00-\x7F]+$/.test(line)) return false; // Xhosa lines carry non-ASCII (’ etc.)
    const words = line.split(/\s+/).filter(Boolean);
    const capWords = words.filter(w => /^[A-Z][a-z]+$/.test(w.replace(/[^A-Za-z]/g, ''))).length;
    const hasEnglishWord = words.some(w => ENGLISH_WORD_SET.has(w.toLowerCase().replace(/[^a-z]/g, '')));
    return capWords >= 3 && hasEnglishWord;
  };

  // First pass over slides: keep only surviving lyric lines, grouped per verse.
  // Metadata (headers/scripture/author/verse-numbers/AMEN) is stripped here so
  // it never reaches the pairing stage.
  const rawVerses: SlideLine[][] = [];
  let sawFirstLyric = false; // used to drop a leading English-title line
  for (let sIdx = 0; sIdx < slidesLines.length; sIdx++) {
    const slideLines = slidesLines[sIdx];
    if (slideLines.length === 0) continue;

    const verseLines: SlideLine[] = [];
    for (const slideLine of slideLines) {
      const isEnglish = slideLine.isEnglish;
      let line = slideLine.text.trim();
      if (line.length === 0) continue;

      // Single-character lines are slide footer/control glyphs (e.g. lone "I",
      // "T", "P" page markers), never real lyrics — drop them.
      if (/^[A-Za-z]$/.test(line)) continue;

      // AMEN terminator (AMEN / Amen. / AMENE / AMEN.) — flag it, never emit it.
      if (/^amen[e]?\s*\.?$/i.test(line)) {
        hasAmen = true;
        continue;
      }
      // A lone footer glyph fused to the terminal AMEN (e.g. "S AMEN", "A Amen.")
      // — flag the AMEN and drop the whole artifact, glyph included.
      if (/^[A-Za-z]\s+amen[e]?\s*\.?$/i.test(line)) {
        hasAmen = true;
        continue;
      }
      // Terminal AMEN fused to the END of a real multi-word lyric line
      // (LibreOffice keeps "Amen." in its own <a:t> run, which gets
      // concatenated onto the preceding lyric run, e.g. "...blessed Trinity
      // Amen." or "...have mercy on us AMEN"). The leading \s+ enforces a word
      // boundary so tokens that merely CONTAIN "amen" (e.g. "Ezisemnyameni.",
      // "sacrament") are untouched. Strip the AMEN, flag it, and KEEP the rest
      // of the lyric — fall through so the cleaned line still passes the
      // remaining metadata filters before being pushed.
      if (/\s+amen[e]?\s*[.!]?$/i.test(line)) {
        hasAmen = true;
        line = line.replace(/\s+amen[e]?\s*[.!]?$/i, '').trim();
        if (line.length === 0) continue;
      }
      // Hymn-number header line (e.g. "XHOSA 11").
      if (isHeaderLine(line)) continue;
      // Author / attribution line.
      if (isAuthorLine(line)) {
        if (!author) author = line.replace(/^by\s+/i, '').trim();
        continue;
      }
      // Standalone verse-index header (e.g. "VERSE 2" or a lone "3.").
      if (/^(verse\s*\d+|\d+\.?)$/i.test(line)) continue;

      // Strip an inline leading verse number ("2. M’ atsho..." -> "M’ atsho...").
      // MUST run before scripture detection so a lyric like "6. Ma siyenze
      // indumiso," is de-numbered first and then correctly rejected as a
      // non-reference (no chapter number after the book token).
      line = line.replace(/^\d+\.\s*/, '').trim();
      if (line.length === 0) continue;

      // Scripture reference: a book name FOLLOWED BY a chapter number. We store
      // only the matched reference substring (e.g. "Psalm 23"), not the whole
      // line. Runs on the de-numbered line so leading verse digits never help it.
      if (!scripture) {
        const refMatch = line.match(SCRIPTURE_REFERENCE_REGEX);
        if (refMatch) {
          scripture = cleanScripture(refMatch[0]);
          continue;
        }
      } else {
        // Already captured; still drop any later pure-reference line so it is not
        // treated as lyrics (only when the ENTIRE de-numbered line is a reference).
        const refMatch = line.match(SCRIPTURE_REFERENCE_REGEX);
        if (refMatch && refMatch[0].trim() === line.trim()) continue;
      }

      // The very first lyric line of the hymn, if English, is the English title
      // shown above the Xhosa (e.g. "Once in Royal David City") — not a lyric.
      // Xhosa-primary hymns always open on a Xhosa line, so this is safe. In
      // marker mode a flagged-English opening line is the same artefact, and
      // the markers say so outright.
      if (!sawFirstLyric) {
        sawFirstLyric = true;
        if (looksLikeEnglishTitle(line) || (markerMode && isEnglish)) {
          droppedEnglishTitle = line;
          continue;
        }
      }

      verseLines.push({ text: line, isEnglish });
    }

    if (verseLines.length > 0) rawVerses.push(verseLines);
  }

  // Decide, per hymn, whether English translations are present. Bilingual decks
  // interleave loosely (often 2 Xhosa lines : 1 English gloss), and the English
  // detector has some misses, so we use a low absolute threshold: a hymn counts
  // as translated only if it has at least 3 detected English lines. Xhosa-only
  // hymns (0 English lines) therefore stay false and never get forced pairings.
  //
  // In MARKER MODE none of that guessing applies: the deck states which lines
  // are English, so a single marked gloss is enough and the >= 3 gate (which
  // silently discarded the English of sparsely-glossed decks) is bypassed.
  const allLines = rawVerses.flat();
  const englishLineCount = markerMode
    ? allLines.filter(l => l.isEnglish).length
    : allLines.filter(l => isEnglishLine(l.text)).length;
  // Whether to ATTEMPT pairing. The final hasTranslations flag is reconciled
  // below against whether any pair was actually formed, so it never lies.
  const attemptTranslations = markerMode ? englishLineCount >= 1 : englishLineCount >= 3;

  // The single predicate that decides "is this line English?". Marker mode is
  // authoritative and deterministic; the word-list heuristic is only consulted
  // for decks that carry no markers at all.
  const lineIsEnglish = (line: SlideLine): boolean =>
    markerMode ? line.isEnglish : isEnglishLine(line.text);

  // Strip wrapping () or [] some decks use around translation lines.
  const unwrap = (s: string): string => {
    const t = s.trim();
    if ((t.startsWith('(') && t.endsWith(')')) || (t.startsWith('[') && t.endsWith(']'))) {
      return t.slice(1, -1).trim();
    }
    return t;
  };

  // Pair lines within a verse. An English line translates the GROUP of preceding
  // primary lines; we attach it to the last of that group and emit any earlier
  // primaries untranslated. Without translations, every line is primary-only.
  // Tracks lines whose `primary` is itself English text (an English-only refrain
  // with no native anchor). In marker mode this replaces re-running the word
  // list over an emitted primary, which would reintroduce exactly the guessing
  // the markers exist to remove.
  const englishPrimaries = new WeakSet<ParsedLine>();

  const buildVerseLines = (verseLines: SlideLine[]): ParsedLine[] => {
    if (!attemptTranslations) {
      return verseLines.map(l => ({ primary: l.text }));
    }
    const lines: ParsedLine[] = [];
    // Native lines awaiting a gloss, kept alongside their flag so the backfill
    // below can tell a real native line from an English one.
    let pending: SlideLine[] = [];
    for (const line of verseLines) {
      if (lineIsEnglish(line)) {
        const translation = unwrap(line.text);
        if (pending.length > 0) {
          for (let i = 0; i < pending.length - 1; i++) lines.push({ primary: pending[i].text });
          lines.push({ primary: pending[pending.length - 1].text, translation });
          pending = [];
        } else {
          // Consecutive English line (buffer already drained). Prefer to backfill
          // the most recent NON-English primary that still lacks a translation —
          // this recovers block-style "XH XH / EN EN" layouts. If there is no such
          // primary, this is a genuine English-only line (e.g. a refrain) and we
          // keep its text as `primary` rather than dropping it.
          const isEnglishPrimary = (l: ParsedLine) =>
            englishPrimaries.has(l) || (!markerMode && isEnglishLine(l.primary));
          const target = [...lines].reverse().find(l => l.translation === undefined && !isEnglishPrimary(l));
          if (target) {
            target.translation = translation;
          } else {
            const emitted: ParsedLine = { primary: translation };
            englishPrimaries.add(emitted);
            lines.push(emitted);
          }
        }
      } else {
        pending.push(line);
      }
    }
    for (const p of pending) lines.push({ primary: p.text });
    return lines;
  };

  const verses: ParsedVerse[] = rawVerses.map((verseLines, idx) => ({
    number: idx + 1,
    lines: buildVerseLines(verseLines)
  }));

  // Reconcile: only claim translations when at least one pair actually formed,
  // so collapsed/unpairable decks never report hasTranslations:true with 0 pairs.
  const hasTranslations = verses.some(v => v.lines.some(l => l.translation !== undefined));

  // Derive the backward-compatible `lyrics` string from the structured verses so
  // the two never drift. Interleaves translation under its primary (as before),
  // keeping English text searchable via the existing lyrics-based search. AMEN
  // is intentionally NOT appended; it is surfaced via the hasAmen flag.
  const finalLyrics = verses
    .map(v => {
      const body = v.lines
        .map(l => (l.translation ? `${l.primary}\n${l.translation}` : l.primary))
        .join('\n');
      return `VERSE ${v.number}\n${body}`;
    })
    .join('\n\n');

  // Backstop: no marker token may ever reach the exported data. If the
  // segmentation missed one, fail loudly here rather than shipping "[ENG]" into
  // a hymn a congregation will read off a projector.
  const leak = verses
    .flatMap(v => v.lines)
    .flatMap(l => [l.primary, l.translation ?? ''])
    .concat(finalLyrics, cleanedTitle)
    .find(text => /\[[ \t]*\/?[ \t]*ENG[ \t]*\]/i.test(text));
  if (leak) {
    throw new Error(`Marker text leaked into parsed output (not exported): ${JSON.stringify(leak)}`);
  }

  return {
    bookId,
    hymnNumber: hymnNum,
    hymnCode: `${bookCode}${hymnNum}`,
    title: cleanedTitle,
    lyrics: finalLyrics,
    verses,
    hasTranslations,
    author: author || 'Traditional Methodist',
    category: category || 'General Worship',
    scripture,
    hasAmen,
    filename,
    englishSource: markerMode ? 'markers' : 'heuristic',
    markerIssues,
    droppedEnglishTitle
  };
}

/**
 * Entry point of pipeline script execution
 */
/**
 * Detects the local installation command path of LibreOffice across platforms.
 */
function getLibreOfficeCommand(): string | null {
  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    if (fs.existsSync(macPath)) {
      return macPath;
    }
  }

  // Probe environment path for standard CLI names
  for (const cmd of ['libreoffice', 'soffice', 'soffice.exe', 'libreoffice.exe']) {
    try {
      const res = spawnSync(cmd, ['--version']);
      if (res.status === 0) {
        return cmd;
      }
    } catch {}
  }

  return null;
}

/**
 * Headlessly converts a .ppt file into a .pptx file using LibreOffice CLI.
 */
function convertPptToPptx(libreCmd: string, pptFilePath: string, outputDir: string): boolean {
  try {
    const res = spawnSync(libreCmd, [
      '--headless',
      '--convert-to',
      'pptx',
      '--outdir',
      outputDir,
      pptFilePath
    ], { stdio: 'inherit' });
    
    return res.status === 0;
  } catch (err: any) {
    console.error(`Error attempting to convert file ${path.basename(pptFilePath)}: ${err.message}`);
    return false;
  }
}

/**
 * Entry point of pipeline script execution
 */
async function main() {
  console.log('----------------------------------------------------');
  console.log('Methodist Hymn Book PPTX Pipeline Processor Starting');
  console.log('----------------------------------------------------');

  // MERGE mode (opt-in via `--merge`): parse ONLY the files currently in
  // import-source/ and upsert them into the existing public/data/xhosa.json by
  // (bookId, hymnNumber), instead of overwriting the whole file. Default (no
  // flag) keeps the original wholesale-overwrite behavior unchanged.
  const MERGE_MODE = process.argv.includes('--merge');

  // --book=<xhosa|sesotho|setswana|english> names the book for a batch whose
  // filenames carry no letter code (the Sesotho "1 Mphe maleme…" form and the
  // unnumbered Setswana decks). A filename that DOES carry a letter code still
  // wins per file, so mixed folders stay correct.
  const bookArg = process.argv.find(a => a.startsWith('--book='));
  const DEFAULT_BOOK_ID = (bookArg ? bookArg.slice('--book='.length).toLowerCase() : 'xhosa') as BookId;
  if (!BOOK_IDS.includes(DEFAULT_BOOK_ID)) {
    throw new Error(`Unknown --book value "${DEFAULT_BOOK_ID}". Expected one of: ${BOOK_IDS.join(', ')}.`);
  }
  console.log(`[BOOK] Default book for files without a letter code: ${DEFAULT_BOOK_ID}`);
  console.log(MERGE_MODE
    ? '[MODE] MERGE — upserting parsed hymns into the existing xhosa.json.'
    : '[MODE] OVERWRITE — regenerating xhosa.json from all converted inputs.');

  // 1. Ensure raw input directory exists
  if (!fs.existsSync(RAW_INPUT_DIR)) {
    fs.mkdirSync(RAW_INPUT_DIR, { recursive: true });
  }

  // Ensure converted target cache folder exists
  fs.mkdirSync(CONVERTED_INPUT_DIR, { recursive: true });

  // Init folders if empty
  const rawContents = fs.readdirSync(RAW_INPUT_DIR);
  const convertedContents = fs.readdirSync(CONVERTED_INPUT_DIR);
  if (rawContents.length === 0 && convertedContents.length === 0) {
    generateMockPowerPoints();
  }

  // Office/LibreOffice leave "~$" lock/owner files behind while a deck is open;
  // they are not real presentations and must be skipped everywhere.
  const isTempLockFile = (f: string) => f.startsWith('~$') || f.startsWith('.~');

  const rawScanFiles = fs.readdirSync(RAW_INPUT_DIR).filter(f => !isTempLockFile(f));
  const pptFiles = rawScanFiles.filter(f => path.extname(f).toLowerCase() === '.ppt');
  const pptxFiles = rawScanFiles.filter(f => path.extname(f).toLowerCase() === '.pptx');

  console.log(`\nScan stats in raw folder "${RAW_INPUT_DIR}":`);
  console.log(`- Legacy .ppt files: ${pptFiles.length}`);
  console.log(`- Modern .pptx files: ${pptxFiles.length}`);

  // Detect LibreOffice command
  const libreOfficeCmd = getLibreOfficeCommand();

  if (pptFiles.length > 0) {
    if (libreOfficeCmd) {
      console.log(`\n[AUTO-CONVERTER] LibreOffice detected at: "${libreOfficeCmd}"`);
      console.log(`Proceeding to convert ${pptFiles.length} legacy .ppt files to .pptx...`);
      for (const pptFile of pptFiles) {
        const fullPptPath = path.join(RAW_INPUT_DIR, pptFile);
        console.log(`[CONVERTING] "${pptFile}" -> "${CONVERTED_INPUT_DIR}"`);
        const ok = convertPptToPptx(libreOfficeCmd, fullPptPath, CONVERTED_INPUT_DIR);
        if (ok) {
          console.log(`  [OK] Converted: "${pptFile}"`);
        } else {
          console.log(`  [ERROR] Failed to convert: "${pptFile}"`);
        }
      }
    } else {
      console.log('\n================================================================');
      console.log('⚠️  LIBREOFFICE CLI NOT FOUND');
      console.log('================================================================');
      console.log('The automatic .ppt -> .pptx converter requires LibreOffice.');
      console.log('You can either install LibreOffice or manually convert the files.');
      console.log('\n--- HOW TO INSTALL LIBREOFFICE (Windows) ---');
      console.log('1. Download LibreOffice from: https://www.libreoffice.org/');
      console.log('2. Run the installer and complete the setup.');
      console.log('3. The script will automatically scan the default folders:');
      console.log('   "C:\\Program Files\\LibreOffice\\program\\soffice.exe"');
      console.log('   No extra PATH configuration necessary if installed in default path!');
      console.log('\n--- HOW TO INSTALL (macOS & Linux) ---');
      console.log('macOS (with Homebrew):');
      console.log('  brew install --cask libreoffice');
      console.log('Ubuntu/Debian:');
      console.log('  sudo apt-get update && sudo apt-get install libreoffice');
      console.log('\n--- MANUAL CONVERSION OPTION (Windows / macOS / Linux) ---');
      console.log('If you prefer to convert manually, you can:');
      console.log('  1. Open your .ppt files and Save As .pptx.');
      console.log('  2. Alternatively, run the following command in CMD/Terminal (if LibreOffice is in PATH):');
      console.log('     soffice --headless --convert-to pptx --outdir import-source-converted import-source/*.ppt');
      console.log('  3. Place all converted .pptx files directly into the directory:');
      console.log(`     "${CONVERTED_INPUT_DIR}"`);
      console.log('  4. Re-run this script!');
      console.log('================================================================\n');
    }
  }

  // Copy any existing .pptx files from raw folder to target folder
  let pptxCopiedCount = 0;
  for (const pptxFile of pptxFiles) {
    const srcPath = path.join(RAW_INPUT_DIR, pptxFile);
    const destPath = path.join(CONVERTED_INPUT_DIR, pptxFile);
    // Copy if it does not already exist
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      pptxCopiedCount++;
    }
  }
  if (pptxCopiedCount > 0) {
    console.log(`[SYNC] Copied ${pptxCopiedCount} pre-existing .pptx files from raw folder to "${CONVERTED_INPUT_DIR}".`);
  }

  // Now, read all .pptx files from the CONVERTED_INPUT_DIR directory!
  let targetFiles = fs.readdirSync(CONVERTED_INPUT_DIR)
    .filter(f => !isTempLockFile(f) && path.extname(f).toLowerCase() === '.pptx');

  // In MERGE mode, parse ONLY the .pptx that correspond to the files currently
  // in import-source/ (derive each raw .ppt/.pptx → its converted .pptx name),
  // so a stale converted cache from a previous full run is never re-parsed.
  if (MERGE_MODE) {
    const expectedConverted = new Set(
      rawScanFiles.map(f =>
        path.extname(f).toLowerCase() === '.ppt'
          ? path.basename(f, path.extname(f)) + '.pptx'
          : f
      )
    );
    targetFiles = targetFiles.filter(f => expectedConverted.has(f));
    console.log(`[MERGE] Restricting to ${targetFiles.length} file(s) derived from import-source/.`);
  }

  console.log(`\nScanning converted inputs... Found ${targetFiles.length} total .pptx files under "${CONVERTED_INPUT_DIR}".`);

  const importedList: ParsedHymn[] = [];
  const report = {
    executedAt: new Date().toISOString(),
    // Distinct hymns processed. The .ppt sources and their converted .pptx are
    // the same hymns, so we count the converted decks once (not ppt + pptx).
    totalFilesScanned: targetFiles.length,
    legacyConverted: pptFiles.length,
    successfulImports: 0,
    failedImports: 0,
    successfulDetails: [] as any[],
    failedDetails: [] as any[],
    duplicateGroups: 0,
    duplicateRecords: 0,
    duplicatesKept: 0,
    duplicatesRejected: 0,
    // Mode + merge accounting (merge fields stay 0 in overwrite mode).
    mode: MERGE_MODE ? 'merge' : 'overwrite',
    existingCount: 0,
    added: 0,
    replaced: 0,
    finalExportedCount: 0,
    exportedByBook: {} as Record<string, number>,
    defaultBookId: DEFAULT_BOOK_ID,
    // How many decks stated their English via [ENG] markers vs. fell back to
    // the word-list heuristic. The headline number for judging an import.
    markerSourced: 0,
    heuristicSourced: 0,
    skippedNoHymnNumber: 0
  };

  const manualReviews: any[] = [];

  // Record unconverted legacy files as alerts if LibreOffice wasn't present to handle them
  if (!libreOfficeCmd && pptFiles.length > 0) {
    for (const pptFile of pptFiles) {
      const convertedCheckPath = path.join(CONVERTED_INPUT_DIR, path.basename(pptFile, '.ppt') + '.pptx');
      if (!fs.existsSync(convertedCheckPath)) {
        console.log(`[FLAG REVIEW] Legacy binary PPT format detected: "${pptFile}" (Needs conversion)`);
        manualReviews.push({
          filename: pptFile,
          reason: 'Legacy binary .ppt format.',
          solution: 'This file is a binary PowerPoint 97-2003 (.ppt) document and LibreOffice was not available to convert it. Please install LibreOffice, or convert it manually to (.pptx) and place it in the import-source-converted folder.'
        });
        report.failedImports++;
        report.failedDetails.push({ filename: pptFile, reason: 'Legacy .ppt binary format (unconverted)' });
      }
    }
  }

  for (const file of targetFiles) {
    const fullPath = path.join(CONVERTED_INPUT_DIR, file);

    // Process .pptx Office XML format
    try {
      console.log(`[PROCESS] Parsing: "${file}"`);
      const parsed = parsePptx(fullPath, DEFAULT_BOOK_ID);
      importedList.push(parsed);

      console.log(` [SUCCESS] Imported Hymn ${parsed.hymnCode}: "${parsed.title}" (${parsed.lyrics.split('\n\n').length} verses, hasAmen: ${parsed.hasAmen})`);
      
      report.successfulImports++;
      if (parsed.englishSource === 'markers') report.markerSourced++; else report.heuristicSourced++;
      report.successfulDetails.push({
        code: parsed.hymnCode,
        number: parsed.hymnNumber,
        title: parsed.title,
        versesCount: parsed.lyrics.split('\n\n').filter(l => l.startsWith('VERSE')).length,
        hasAmen: parsed.hasAmen,
        scripture: parsed.scripture,
        hasTranslations: parsed.hasTranslations,
        englishSource: parsed.englishSource
      });

      // Standard validation flags showing items that might need some spot checks.
      // Uses the shared helper so dedup scoring sees the identical warning set.
      const validationWarnings: string[] = computeWarnings(parsed);

      if (validationWarnings.length > 0) {
        manualReviews.push({
          filename: file,
          hymnCode: parsed.hymnCode,
          title: parsed.title,
          warnings: validationWarnings,
          partialParsedResult: {
            title: parsed.title,
            scripture: parsed.scripture,
            hasAmen: parsed.hasAmen,
            versesSample: parsed.lyrics.substring(0, 150) + '...'
          }
        });
      }

    } catch (err: any) {
      const noNumber = /No hymn number in filename or slide header/.test(err.message);
      console.error(` [FAIL] Unable to parse file "${file}":`, err.message);
      report.failedImports++;
      if (noNumber) report.skippedNoHymnNumber++;
      report.failedDetails.push({ filename: file, error: err.message });
      manualReviews.push({
        filename: file,
        reason: noNumber
          ? 'No hymn number in filename or slide header — skipped rather than assigned a guessed number'
          : 'Parsing exception failed',
        errorDetails: err.message
      });
    }
  }

  // --- DEDUP: collapse multiple source decks that share a (bookId, hymnNumber)
  // identity down to the single cleanest record. Winner = highest tuple of
  // [markerMode?1:0, verseCount, pairedTranslationCount, hasAmen?1:0, -warningCount];
  // ties broken by filename ascending (deterministic). A marked deck always
  // supersedes an unmarked copy of the same hymn, because its English is stated
  // rather than guessed. Rejected records are routed to manual-review with full
  // provenance.
  const pairedTranslationCount = (p: ParsedHymn): number =>
    p.verses.reduce((acc, v) => acc + v.lines.filter(l => l.translation !== undefined).length, 0);

  type DedupScore = [number, number, number, number, number];
  const scoreOf = (p: ParsedHymn): DedupScore => [
    p.englishSource === 'markers' ? 1 : 0,
    p.verses.length,
    pairedTranslationCount(p),
    p.hasAmen ? 1 : 0,
    -computeWarnings(p).length
  ];
  // Returns negative if a should sort before b (a is better/keeps priority).
  const compareCandidates = (a: ParsedHymn, b: ParsedHymn): number => {
    const sa = scoreOf(a);
    const sb = scoreOf(b);
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) return sb[i] - sa[i]; // higher wins -> sorts first
    }
    return a.filename.localeCompare(b.filename); // tiebreak: filename ascending
  };

  const dedupGroups = new Map<string, ParsedHymn[]>();
  for (const h of importedList) {
    const key = `${h.bookId}::${h.hymnNumber}`;
    const arr = dedupGroups.get(key);
    if (arr) arr.push(h);
    else dedupGroups.set(key, [h]);
  }

  const dedupedList: ParsedHymn[] = [];
  for (const [, group] of dedupGroups) {
    if (group.length === 1) {
      dedupedList.push(group[0]);
      continue;
    }
    // A genuine duplicate identity group.
    report.duplicateGroups++;
    report.duplicateRecords += group.length;
    const ranked = [...group].sort(compareCandidates);
    const winner = ranked[0];
    dedupedList.push(winner);
    report.duplicatesKept++;

    // Soft note if the surviving title carries a trailing version number (e.g.
    // "... laKho 2") — we deliberately do NOT strip it (out of scope), just flag.
    if (/\s\d+$/.test(winner.title)) {
      manualReviews.push({
        filename: winner.filename,
        hymnCode: winner.hymnCode,
        title: winner.title,
        warnings: ['Winning duplicate title ends with a trailing version number — verify the intended title.']
      });
    }

    const winnerScore = scoreOf(winner);
    for (let i = 1; i < ranked.length; i++) {
      const loser = ranked[i];
      report.duplicatesRejected++;
      console.log(`[FLAG REVIEW] Duplicate identity: "${loser.filename}" superseded by "${winner.filename}" (hymn ${winner.bookId} ${winner.hymnNumber}).`);
      manualReviews.push({
        filename: loser.filename,
        hymnCode: loser.hymnCode,
        title: loser.title,
        reason: 'Duplicate identity record — superseded by cleaner record',
        duplicateOf: { filename: winner.filename, hymnCode: winner.hymnCode },
        rejectedScore: scoreOf(loser),
        winnerScore
      });
    }
  }

  // 3. Write outputs — one file per book, e.g. public/data/xhosa.json.
  fs.mkdirSync(OUTPUT_DATA_DIR, { recursive: true });

  // Format the output exactly like standard React component schema: An array of Hymns
  const toRecord = (h: ParsedHymn) => ({
    bookId: h.bookId,
    hymnNumber: h.hymnNumber,
    hymnCode: h.hymnCode,
    title: h.title,
    reference: h.scripture, // scripture reference kept separate from category (omitted by JSON when undefined)
    hasTranslations: h.hasTranslations,
    verses: h.verses, // structured primary source: [{ number, lines: [{ primary, translation? }] }]
    lyrics: h.lyrics, // backward-compatible flat string (kept in sync with verses)
    amen: h.hasAmen,
    author: h.author,
    category: h.category
  });
  type HymnRecord = ReturnType<typeof toRecord>;

  // Sort helper: ascending by hymnNumber with a stable bookId tiebreak. Applied
  // in BOTH modes so every book file is always emitted in numeric order.
  const byHymnNumber = (a: { hymnNumber: number; bookId: string }, b: { hymnNumber: number; bookId: string }) =>
    a.hymnNumber - b.hymnNumber || String(a.bookId).localeCompare(String(b.bookId));

  // Group the deduped hymns by book. Only books that actually produced records
  // are written, so a Sesotho batch can never truncate xhosa.json.
  const byBook = new Map<BookId, HymnRecord[]>();
  for (const h of dedupedList) {
    const arr = byBook.get(h.bookId);
    if (arr) arr.push(toRecord(h));
    else byBook.set(h.bookId, [toRecord(h)]);
  }

  const totalParsedRecords = dedupedList.length;

  // Guard 1: never shrink a catalogue on a bad/partial run. A deck skipped for
  // having no resolvable hymn number is a deliberate, reported outcome (it is
  // in manual-review.json), so it is subtracted from the expectation rather
  // than treated as a fault. Any OTHER failure, or an unexplained shortfall,
  // aborts the merge with every book file left untouched.
  const unexpectedFailures = report.failedImports - report.skippedNoHymnNumber;
  const expectedRecords = targetFiles.length - report.skippedNoHymnNumber - report.duplicatesRejected;
  if (MERGE_MODE && (unexpectedFailures > 0 || totalParsedRecords !== expectedRecords)) {
    throw new Error(
      `MERGE aborted: expected ${expectedRecords} record(s) but got ${totalParsedRecords} ` +
      `(files=${targetFiles.length}, skippedNoHymnNumber=${report.skippedNoHymnNumber}, ` +
      `deduped=${report.duplicatesRejected}, otherFailures=${unexpectedFailures}). ` +
      `Existing book files left untouched.`
    );
  }

  for (const [bookId, records] of byBook) {
    const outPath = outputPathForBook(bookId);
    let outputArray: HymnRecord[];

    if (MERGE_MODE) {
      // Guard 2: load the existing file. If it exists but cannot be read/parsed
      // as an array, ABORT — never treat a corrupt read as empty (that path
      // would replace the whole catalogue with only the merged few).
      let existing: HymnRecord[] = [];
      if (fs.existsSync(outPath)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        } catch (e: any) {
          throw new Error(`MERGE aborted: existing "${outPath}" is unreadable/corrupt (${e.message}). Left untouched.`);
        }
        if (!Array.isArray(parsed)) {
          throw new Error(`MERGE aborted: existing "${outPath}" is not a JSON array. Left untouched.`);
        }
        existing = parsed as HymnRecord[];
      }

      // Upsert by (bookId, hymnNumber): replace on key match, else add.
      const mergeMap = new Map<string, HymnRecord>();
      for (const rec of existing) mergeMap.set(`${rec.bookId}::${rec.hymnNumber}`, rec);
      report.existingCount += mergeMap.size;
      for (const rec of records) {
        const key = `${rec.bookId}::${rec.hymnNumber}`;
        if (mergeMap.has(key)) report.replaced++; else report.added++;
        mergeMap.set(key, rec);
      }
      outputArray = [...mergeMap.values()].sort(byHymnNumber);
      console.log(`[MERGE] ${bookId}: existing=${existing.length}, final=${outputArray.length}`);
    } else {
      outputArray = [...records].sort(byHymnNumber);
    }

    report.finalExportedCount += outputArray.length;
    report.exportedByBook[bookId] = outputArray.length;

    // Atomic write (tmp + rename) so an interrupted write can never leave a torn
    // or truncated book file.
    const tmpPath = outPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(outputArray, null, 2), 'utf8');
    fs.renameSync(tmpPath, outPath);
    console.log(`\nSuccessfully exported ${outputArray.length} ${bookId} hymns to: "${outPath}"`);
  }

  if (byBook.size === 0) {
    console.log('\nNo hymns were exported — nothing parsed successfully.');
  }

  // Export report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Saved execution stats report data to: "${REPORT_PATH}"`);

  // Export manual review requirements
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(manualReviews, null, 2), 'utf8');
  console.log(`Exported manual review index with instructions to: "${REVIEW_PATH}"`);

  console.log('----------------------------------------------------');
  console.log('PPTX Pipeline processing finished successfully.');
  console.log('----------------------------------------------------');
}

// Only run the pipeline when this file is executed directly. Importing it (the
// test suite does) must not touch the filesystem.
const isDirectRun = Boolean(
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);
if (isDirectRun) {
  main().catch(err => {
    console.error('Fatal execution crashed in PowerPoint pipeline engine:', err);
    process.exitCode = 1;
  });
}

export { parsePptx, computeWarnings, main };
