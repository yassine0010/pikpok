import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, normalizeAnswer } from '../src/lib/answer.js';

/**
 * Pure unit tests for answer normalization/checking (M5). No database, no app
 * — runs even when the runtime databases are unavailable.
 */

describe('normalizeAnswer', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeAnswer('  8  ')).toBe('8');
    expect(normalizeAnswer('Archivist   Ben,\t\tChloe')).toBe('archivist ben, chloe');
  });

  it('lowercases everything', () => {
    expect(normalizeAnswer('Arm 5')).toBe('arm 5');
    expect(normalizeAnswer('SECTION BETA')).toBe('section beta');
  });

  it('unifies unicode minus signs, typographic quotes and odd spaces', () => {
    expect(normalizeAnswer('\u22125')).toBe('-5'); // U+2212 MINUS SIGN
    expect(normalizeAnswer('9\u20134')).toBe('9-4'); // en dash
    expect(normalizeAnswer('\u201C 8 \u201D')).toBe('8'); // curly double quotes
    expect(normalizeAnswer('\u2018ben\u2019')).toBe('ben'); // curly single quotes
    expect(normalizeAnswer('a\u00A0b')).toBe('a b'); // NBSP
    expect(normalizeAnswer('\uFF18')).toBe('8'); // full-width digit
  });

  it('drops surrounding quotes and dangling sentence punctuation', () => {
    expect(normalizeAnswer('"Section Beta"')).toBe('section beta');
    expect(normalizeAnswer("'9'.")).toBe('9');
    expect(normalizeAnswer('Arm 5!')).toBe('arm 5');
    expect(normalizeAnswer('Ben;')).toBe('ben');
  });

  it('NEVER mangles operator answers (missing_operator semantics)', () => {
    expect(normalizeAnswer('+')).toBe('+');
    expect(normalizeAnswer('*, ^')).toBe('*, ^');
    expect(normalizeAnswer('+ , *')).toBe('+ , *');
  });

  it('keeps commas in list answers (only whole-text numeric text loses them)', () => {
    expect(normalizeAnswer('Archivist Ben, Conservator Anya, Historian Chloe')).toBe(
      'archivist ben, conservator anya, historian chloe',
    );
    expect(normalizeAnswer('1,234')).toBe('1234');
    expect(normalizeAnswer('12,345,678')).toBe('12345678');
    expect(normalizeAnswer('-9,876.5')).toBe('-9876.5');
    // Not a thousand-separated number: untouched.
    expect(normalizeAnswer('12,34')).toBe('12,34');
  });

  it('is idempotent (safe to apply to already-stored variants)', () => {
    const once = normalizeAnswer('  Section  Beta  ');
    expect(normalizeAnswer(once)).toBe(once);
  });
});

describe('isAnswerCorrect', () => {
  const VARIANTS = ['8', 'archivist ben, conservator anya, historian chloe', '1234'];

  it('matches after normalization', () => {
    expect(isAnswerCorrect(' 8 ', VARIANTS)).toBe(true);
    expect(isAnswerCorrect('  1,234  ', VARIANTS)).toBe(true);
    expect(isAnswerCorrect('ARCHIVIST BEN,   CONSERVATOR ANYA, HISTORIAN CHLOE', VARIANTS)).toBe(true);
    expect(isAnswerCorrect('"Historian Chloe"', ['historian chloe'])).toBe(true);
  });

  it('uses a numeric fallback with 1e-9 tolerance on float representations', () => {
    expect(isAnswerCorrect('8.0', ['8'])).toBe(true);
    expect(isAnswerCorrect('8', ['8.000000000'])).toBe(true);
    expect(isAnswerCorrect('1000000.0000000001', ['1,000,000'])).toBe(true);
    expect(isAnswerCorrect('1000000.01', ['1,000,000'])).toBe(false);
  });

  it('rejects wrong answers', () => {
    expect(isAnswerCorrect('9', VARIANTS)).toBe(false);
    expect(isAnswerCorrect('archivist ben, conservator anya, historian chloe', VARIANTS.slice(0, 1))).toBe(false);
    expect(isAnswerCorrect('', [])).toBe(false);
  });

  it('does not accept superstrings or truncated answers', () => {
    expect(isAnswerCorrect('162x', ['162'])).toBe(false);
    expect(isAnswerCorrect('16', ['162'])).toBe(false);
  });

  it('keeps operator semantics exact', () => {
    expect(isAnswerCorrect('+', ['+'])).toBe(true);
    expect(isAnswerCorrect('*, ^', ['*, ^'])).toBe(true);
    expect(isAnswerCorrect('+', ['*'])).toBe(false);
  });
});
