/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests for the PowerPoint -> Hymn import pipeline.
 *
 * Run with: npm test   (tsx --test, Node's built-in runner — no extra deps)
 *
 * The fixtures below are not invented shapes. Every marker layout asserted here
 * was taken from the real `* HYMNS MARKED` decks after LibreOffice conversion,
 * because the marking pass wrapped text per PowerPoint *formatting run* and the
 * resulting XML does not line up with the visible lines.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';

import {
  splitEnglishMarkers,
  extractTextFromSlideXml,
  resolveIdentityFromFilename,
  parsePptx,
  isEnglishLine
} from './import_hymns.js';

// --------------------------------------------------------------------------
// Fixture helpers
// --------------------------------------------------------------------------

/** Wrap text runs into one <a:p>, separated by <a:br/> — the LibreOffice shape. */
const paragraphXml = (runs: string[]) =>
  `<a:p><a:pPr/>${runs
    .map(r => `<a:r><a:rPr lang="en-US"/><a:t>${r}</a:t></a:r>`)
    .join('<a:br><a:rPr lang="en-US"/></a:br>')}</a:p>`;

const slideXml = (paragraphs: string[][]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:bodyPr/><a:lstStyle/>
  ${paragraphs.map(paragraphXml).join('')}
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;

let tmpDir: string | null = null;
const scratch = (): string => {
  if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mhb-import-test-'));
  return tmpDir;
};

/** Build a .pptx on disk whose slides carry the given lines, and return its path. */
function makePptx(basename: string, slides: string[][]): string {
  const zip = new AdmZip();
  slides.forEach((lines, i) => {
    zip.addFile(`ppt/slides/slide${i + 1}.xml`, Buffer.from(slideXml([lines]), 'utf8'));
  });
  const filePath = path.join(scratch(), `${basename}.pptx`);
  zip.writeZip(filePath);
  return filePath;
}

const primaries = (h: ReturnType<typeof parsePptx>) =>
  h.verses.flatMap(v => v.lines.map(l => l.primary));
const pairs = (h: ReturnType<typeof parsePptx>) =>
  h.verses.flatMap(v => v.lines.filter(l => l.translation).map(l => [l.primary, l.translation]));

test.after(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// splitEnglishMarkers — the marker state machine
// --------------------------------------------------------------------------

test('single [ENG] region on one line', () => {
  const r = splitEnglishMarkers('Masibulele kuYesu ,\n[ENG]Let us give thanks to Jesus[/ENG]');
  assert.deepEqual(r.lines, [
    { text: 'Masibulele kuYesu ,', isEnglish: false },
    { text: 'Let us give thanks to Jesus', isEnglish: true }
  ]);
  assert.equal(r.markerCount, 2);
  assert.equal(r.unterminated, 0);
});

test('[/ENG] at the start of the NEXT line keeps that line native', () => {
  // The dominant real shape: the PowerPoint run swallowed the trailing
  // paragraph mark, so the closing marker is fused to the next native line.
  // A line-oriented parser would wrongly mark "Ke bitsa ho uena;" as English.
  const r = splitEnglishMarkers(
    '1. Tsietsing tsa letsoalo,\n[ENG]When I’m troubled from within\n[/ENG]Ke bitsa ho uena;'
  );
  assert.deepEqual(r.lines, [
    { text: '1. Tsietsing tsa letsoalo,', isEnglish: false },
    { text: 'When I’m troubled from within', isEnglish: true },
    { text: 'Ke bitsa ho uena;', isEnglish: false }
  ]);
});

test('a region spanning two paragraphs yields two English lines', () => {
  const r = splitEnglishMarkers(
    'Ka lineo tsohle tsa hao,\n[ENG]We have been saved by grace,\nWith all your blessings\n[/ENG]Reko la hao le le holo'
  );
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Ka lineo tsohle tsa hao,', false],
    ['We have been saved by grace,', true],
    ['With all your blessings', true],
    ['Reko la hao le le holo', false]
  ]);
});

test('four regions in one slide (real X041 slide 1)', () => {
  const r = splitEnglishMarkers(
    [
      'Masibulele kuYesu ,',
      '[ENG]Let us give thanks to Jesus[/ENG] ',
      'Ngokuba wasifela;',
      '[ENG]For He died for us[/ENG] ',
      'Wasenzela izibele,',
      'Ngokusifela kwaKhe.',
      '[ENG]What an act of grace[/ENG] ',
      'Taru! BAwo,',
      'Yiba nofefe kuthi. ',
      '[ENG]Pardon us Father, have mercy on us[/ENG]'
    ].join('\n')
  );
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Masibulele kuYesu ,', false],
    ['Let us give thanks to Jesus', true],
    ['Ngokuba wasifela;', false],
    ['For He died for us', true],
    ['Wasenzela izibele,', false],
    ['Ngokusifela kwaKhe.', false],
    ['What an act of grace', true],
    ['Taru! BAwo,', false],
    ['Yiba nofefe kuthi.', false],
    ['Pardon us Father, have mercy on us', true]
  ]);
  assert.equal(r.markerCount, 8);
});

test('marker mid-line splits native and English on the same visual line', () => {
  const r = splitEnglishMarkers('Kagiso, go nee kagiso. [ENG]Peace, let there be peace[/ENG] Amen');
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Kagiso, go nee kagiso.', false],
    ['Peace, let there be peace', true],
    ['Amen', false]
  ]);
});

test('tolerates whitespace and case variations in the markers', () => {
  const r = splitEnglishMarkers('Native line\n[ eng ]  Glossed text  [/ Eng ]\nMore native');
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Native line', false],
    ['Glossed text', true],
    ['More native', false]
  ]);
});

test('unterminated [ENG] closes at end of slide and is counted', () => {
  const r = splitEnglishMarkers('Native line\n[ENG]English with no closing marker\nStill English');
  assert.equal(r.unterminated, 1);
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Native line', false],
    ['English with no closing marker', true],
    ['Still English', true]
  ]);
});

test('stray [/ENG] is dropped and the surrounding text stays native', () => {
  const r = splitEnglishMarkers('Native one\n[/ENG]Native two');
  assert.equal(r.strayClose, 1);
  assert.equal(r.unterminated, 0);
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Native one', false],
    ['Native two', false]
  ]);
});

test('nested [ENG] is ignored and the outer region stays open', () => {
  const r = splitEnglishMarkers('Native\n[ENG]One [ENG]two[/ENG]\nNative again');
  assert.equal(r.nestedOpen, 1);
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['Native', false],
    ['One two', true],
    ['Native again', false]
  ]);
});

test('a lone [/ENG] line leaves no empty lyric line behind', () => {
  const r = splitEnglishMarkers('[ENG]And we live joyfully under Your protection.\n[/ENG]');
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [
    ['And we live joyfully under Your protection.', true]
  ]);
});

test('a marked region holding only a pointing glyph is spliced back inline', () => {
  // Real X175: red Sesotho chant-pointing pipes were wrapped by the colour pass.
  // Treating them as English would tear "ma |holimong," into two lines.
  const r = splitEnglishMarkers('Ntat’ a rona ea ma [ENG]|[/ENG]holimong,');
  assert.equal(r.degenerate, 1);
  assert.deepEqual(r.lines, [{ text: 'Ntat’ a rona ea ma |holimong,', isEnglish: false }]);
});

test('a marked region holding a single letter is not treated as a translation', () => {
  // Real X54: red drop-cap / page-marker letters, not English.
  const r = splitEnglishMarkers('Uzuko enyangweni,\n[ENG]T[/ENG]\nUThix’ ongabonwayo');
  assert.equal(r.degenerate, 1);
  assert.ok(r.lines.every(l => !l.isEnglish), 'no line should be flagged English');
  assert.deepEqual(r.lines.map(l => l.text), ['Uzuko enyangweni,', 'T', 'UThix’ ongabonwayo']);
});

test('a one-word gloss is still a real translation', () => {
  const r = splitEnglishMarkers('Kagiso,\n[ENG]Peace[/ENG]');
  assert.equal(r.degenerate, 0);
  assert.deepEqual(r.lines.map(l => [l.text, l.isEnglish]), [['Kagiso,', false], ['Peace', true]]);
});

test('unmarked text produces a single native run and no markers', () => {
  const r = splitEnglishMarkers('Bulelani kuYehova,\nNgokuba elungile,');
  assert.equal(r.markerCount, 0);
  assert.ok(r.lines.every(l => !l.isEnglish));
});

// --------------------------------------------------------------------------
// extractTextFromSlideXml — run/paragraph reassembly
// --------------------------------------------------------------------------

test('a marker split across two <a:t> runs is reassembled', () => {
  // LibreOffice puts "[ENG]" in its own run and fuses "[/ENG]" to the text run.
  const xml = slideXml([['Masibulele kuYesu', ' ,']]).replace(
    '<a:t> ,</a:t>',
    '<a:t> ,</a:t></a:r><a:br/><a:r><a:t>[ENG]</a:t></a:r><a:r><a:t>Let us give thanks[/ENG]</a:t>'
  );
  const lines = extractTextFromSlideXml(xml);
  assert.ok(
    lines.includes('[ENG]Let us give thanks[/ENG]'),
    `expected reassembled marker line, got ${JSON.stringify(lines)}`
  );
});

test('<a:br/> separates lines within a single paragraph', () => {
  const lines = extractTextFromSlideXml(slideXml([['Line one', 'Line two', 'Line three']]));
  assert.deepEqual(lines, ['Line one', 'Line two', 'Line three']);
});

// --------------------------------------------------------------------------
// Filename / hymn-number identity
// --------------------------------------------------------------------------

test('lettered filename resolves book and number', () => {
  const id = resolveIdentityFromFilename('X011 Bulelani kuYehova', 'xhosa');
  assert.equal(id.bookId, 'xhosa');
  assert.equal(id.hymnNumber, 11);
  assert.equal(id.title, 'Bulelani kuYehova');
});

test('bare-number filename takes its book from --book', () => {
  const id = resolveIdentityFromFilename('1 Mphe maleme a sekete', 'sesotho');
  assert.equal(id.bookId, 'sesotho');
  assert.equal(id.hymnNumber, 1);
  assert.equal(id.title, 'Mphe maleme a sekete');
});

test('doubled spaces in a Sesotho filename collapse in the title', () => {
  const id = resolveIdentityFromFilename('170  Hee! Ba nyorilweng MHB 317', 'sesotho');
  assert.equal(id.hymnNumber, 170);
  assert.equal(id.title, 'Hee! Ba nyorilweng MHB 317');
});

test('unnumbered filename reports no number so the deck header can supply it', () => {
  const id = resolveIdentityFromFilename('Ao! Morena wa kagiso', 'setswana');
  assert.equal(id.hymnNumber, null);
  assert.equal(id.bookId, 'setswana');
});

test('ambiguous "S" code follows --book instead of the dead sesotho branch', () => {
  assert.equal(resolveIdentityFromFilename('S005 Re a go baka', 'sesotho').bookId, 'sesotho');
  assert.equal(resolveIdentityFromFilename('S005 Re a go baka', 'xhosa').bookId, 'setswana');
});

// --------------------------------------------------------------------------
// parsePptx — end to end
// --------------------------------------------------------------------------

test('marked deck: markers drive the translations (real X041 shape)', () => {
  const file = makePptx('X041 Masibulele kuYesu', [
    [
      'Masibulele kuYesu ,',
      '[ENG]Let us give thanks to Jesus[/ENG] ',
      'Ngokuba wasifela;',
      '[ENG]For He died for us[/ENG] ',
      'Wasenzela izibele,',
      'Ngokusifela kwaKhe.',
      '[ENG]What an act of grace[/ENG] ',
      'Taru! BAwo,',
      'Yiba nofefe kuthi. ',
      '[ENG]Pardon us Father, have mercy on us[/ENG] AMEN'
    ]
  ]);
  const hymn = parsePptx(file, 'xhosa');

  assert.equal(hymn.englishSource, 'markers');
  assert.equal(hymn.bookId, 'xhosa');
  assert.equal(hymn.hymnNumber, 41);
  assert.equal(hymn.hasTranslations, true);
  assert.equal(hymn.hasAmen, true, 'AMEN fused after the closing marker is still detected');

  // Native text is preserved verbatim, in order, with no English mixed in.
  assert.deepEqual(primaries(hymn), [
    'Masibulele kuYesu ,',
    'Ngokuba wasifela;',
    'Wasenzela izibele,',
    'Ngokusifela kwaKhe.',
    'Taru! BAwo,',
    'Yiba nofefe kuthi.'
  ]);

  // A gloss covering two native lines binds to the second of them.
  assert.deepEqual(pairs(hymn), [
    ['Masibulele kuYesu ,', 'Let us give thanks to Jesus'],
    ['Ngokuba wasifela;', 'For He died for us'],
    ['Ngokusifela kwaKhe.', 'What an act of grace'],
    ['Yiba nofefe kuthi.', 'Pardon us Father, have mercy on us']
  ]);
});

test('marker text never leaks into verses, lyrics or title', () => {
  const file = makePptx('X041 Masibulele kuYesu', [
    ['Masibulele kuYesu ,', '[ENG]Let us give thanks to Jesus[/ENG]']
  ]);
  const hymn = parsePptx(file, 'xhosa');
  const everything = JSON.stringify(hymn);
  assert.ok(!/\[\s*\/?\s*ENG\s*\]/i.test(everything), 'no marker token may survive into output');
});

test('marked deck with [/ENG] on the next line keeps the native line native', () => {
  const file = makePptx('206 Tsietsing tsa letsoalo', [
    [
      'SOTHO 206',
      '1. Tsietsing tsa letsoalo,',
      '[ENG]When I’m troubled from within',
      '[/ENG]Ke bitsa ho uena;',
      '[ENG]I cry out to You',
      '[/ENG]U mamele thapelo,'
    ]
  ]);
  const hymn = parsePptx(file, 'sesotho');

  assert.equal(hymn.bookId, 'sesotho');
  assert.equal(hymn.hymnNumber, 206);
  assert.equal(hymn.englishSource, 'markers');
  // The Sesotho lines must NOT have been swallowed as English.
  assert.deepEqual(primaries(hymn), ['Tsietsing tsa letsoalo,', 'Ke bitsa ho uena;', 'U mamele thapelo,']);
  assert.deepEqual(pairs(hymn), [
    ['Tsietsing tsa letsoalo,', 'When I’m troubled from within'],
    ['Ke bitsa ho uena;', 'I cry out to You']
  ]);
});

test('a single marked gloss is enough — the old ">= 3 English lines" gate is bypassed', () => {
  const file = makePptx('X999 Sparse gloss', [
    ['Ndiyabulela Nkosi,', '[ENG]I thank you Lord[/ENG]', 'Ngenxa yothando lwakho.']
  ]);
  const hymn = parsePptx(file, 'xhosa');
  assert.equal(hymn.englishSource, 'markers');
  assert.equal(hymn.hasTranslations, true);
  assert.deepEqual(pairs(hymn), [['Ndiyabulela Nkosi,', 'I thank you Lord']]);
});

test('unnumbered Setswana deck takes its number from the slide header', () => {
  const file = makePptx('Ao! Morena wa kagiso', [
    [
      'TSWANA 397',
      '1. Ao! Morena wa kagiso,',
      '[ENG]O! Lord of Peace[/ENG]',
      'Senya bogale jwa baba;',
      '[ENG]Defeat the power of the enemy',
      '[/ENG]Dintwa ka gotlhe di fele,'
    ]
  ]);
  const hymn = parsePptx(file, 'setswana');

  assert.equal(hymn.bookId, 'setswana');
  assert.equal(hymn.hymnNumber, 397);
  assert.equal(hymn.title, 'Ao! Morena wa kagiso');
  // The header line is metadata, not a lyric.
  assert.ok(!primaries(hymn).includes('TSWANA 397'));
  assert.deepEqual(primaries(hymn), [
    'Ao! Morena wa kagiso,',
    'Senya bogale jwa baba;',
    'Dintwa ka gotlhe di fele,'
  ]);
});

test('deck with no resolvable number is rejected rather than given a guessed one', () => {
  const file = makePptx('bogolo jwa bomodimo', [['Bogolo jwa Bomodimo,', 'Ke bogolo jo bogolo.']]);
  assert.throws(() => parsePptx(file, 'setswana'), /No hymn number in filename or slide header/);
});

test('multi-paragraph English block distributes across the preceding native lines', () => {
  const file = makePptx('16 Rea u boka Morena', [
    [
      'SOTHO 16',
      '1. Rea u boka Morena,',
      'Re ntse re thabela Uena',
      '[ENG]We glorify You God and You alone',
      '[/ENG]Re saphela ha monate,'
    ]
  ]);
  const hymn = parsePptx(file, 'sesotho');
  assert.equal(hymn.hymnNumber, 16);
  assert.deepEqual(primaries(hymn), [
    'Rea u boka Morena,',
    'Re ntse re thabela Uena',
    'Re saphela ha monate,'
  ]);
  assert.deepEqual(pairs(hymn), [['Re ntse re thabela Uena', 'We glorify You God and You alone']]);
});

test('deck whose only red runs are pointing glyphs keeps its lines whole', () => {
  const file = makePptx('X175 Ndiza ndingento yalutho', [
    [
      'Ntat’ a rona ea ma [ENG]|[/ENG]holimong,',
      'Lebitso la hao a le [ENG]|[/ENG] ke le khethehe.'
    ]
  ]);
  const hymn = parsePptx(file, 'xhosa');
  assert.equal(hymn.englishSource, 'heuristic', 'glyph-only regions do not make a marked deck');
  assert.deepEqual(primaries(hymn), [
    'Ntat’ a rona ea ma |holimong,',
    'Lebitso la hao a le | ke le khethehe.'
  ]);
});

// --------------------------------------------------------------------------
// Fallback: unmarked decks keep the original heuristic behaviour
// --------------------------------------------------------------------------

test('unmarked bilingual deck still falls back to the word-list heuristic', () => {
  const file = makePptx('X009 Ma zith iingqondo zethu', [
    [
      'Ma zith’ iingqondo zethu,',
      'Let us with a gladsome mind',
      'Zimbonge uYehova;',
      'Praise the Lord, for He is kind:',
      'Kuba iinceba zaKhe,',
      'For His mercies shall endure'
    ]
  ]);
  const hymn = parsePptx(file, 'xhosa');
  assert.equal(hymn.englishSource, 'heuristic', 'no markers => heuristic path');
  assert.equal(hymn.hasTranslations, true);
  assert.deepEqual(pairs(hymn), [
    ['Ma zith’ iingqondo zethu,', 'Let us with a gladsome mind'],
    ['Zimbonge uYehova;', 'Praise the Lord, for He is kind:'],
    ['Kuba iinceba zaKhe,', 'For His mercies shall endure']
  ]);
});

test('monolingual unmarked deck produces no translations', () => {
  const file = makePptx('X011 Bulelani kuYehova', [
    ['Bulelani kuYehova,', 'Ngokuba elungile,', 'Amanabakhulu akhe,', 'Nenceba yakhe ihleli.']
  ]);
  const hymn = parsePptx(file, 'xhosa');
  assert.equal(hymn.englishSource, 'heuristic');
  assert.equal(hymn.hasTranslations, false);
  assert.equal(hymn.verses[0].lines.length, 4);
});

test('stripping the markers from a marked deck reverts it to the heuristic path', () => {
  const marked = [
    'Ndiyabulela Nkosi,',
    '[ENG]I thank you Lord[/ENG]',
    'Ngenxa yothando lwakho.'
  ];
  const stripped = marked.map(l => l.replace(/\[\/?ENG\]/g, ''));

  assert.equal(parsePptx(makePptx('X998 marked', [marked]), 'xhosa').englishSource, 'markers');
  assert.equal(parsePptx(makePptx('X997 stripped', [stripped]), 'xhosa').englishSource, 'heuristic');
});

test('isEnglishLine remains the heuristic-only predicate it always was', () => {
  assert.equal(isEnglishLine('Let us with a gladsome mind'), true);
  assert.equal(isEnglishLine('Bulelani kuYehova,'), false);
});
