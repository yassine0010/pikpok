/**
 * Answer normalization + checking for the puzzle feed (M5).
 *
 * Pure string logic with no IO, imported by BOTH sides of the answer flow so
 * they can never drift apart:
 *   - `src/db/import-puzzles.ts` stores `accepted_variants` built with
 *     `normalizeAnswer` at import time;
 *   - `src/routes/puzzles.ts` compares submissions with `isAnswerCorrect`
 *     against those stored variants.
 *
 * Normalization must be conservative: answers can be semantic tokens such as
 * the operator strings `+` or `*, ^` (missing_operator puzzles), so surrounding
 * punctuation stripping is limited to characters that are never meaningful
 * there (quotes, sentence punctuation on the ends only) — never the operators
 * themselves, and never commas inside non-numeric text (list answers).
 */

/**
 * Unicode inversions: typographic quotes → ASCII, odd spaces → plain space,
 * unicode dashes/minus → `-`, full-width digits → ASCII.
 */
function unifyUnicode(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u00A0\u2000-\u200B\u202F\u3000]/g, ' ')
    .replace(/[\u2010-\u2015\u2212\u2043\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

/**
 * `1,234` → `1234` for thousand-separated numeric text (whole string).
 * Commas in non-numeric text (e.g. "A, B, C") are left untouched.
 */
function stripThousands(value: string): string {
  return /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(value) ? value.replace(/,/g, '') : value;
}

/**
 * Canonical form used for both stored variants and runtime submissions:
 * trim, unify unicode quirks, lowercase, collapse internal whitespace to
 * single spaces, drop surrounding quotes and dangling sentence punctuation,
 * and drop thousand separators inside purely numeric text.
 */
export function normalizeAnswer(input: string): string {
  let value = unifyUnicode(input).trim().toLowerCase();

  // Surrounding quotes (any mix), then dangling sentence punctuation.
  // Deliberately excludes operators/math symbols: `+`, `*`, `^`, `-`, `,`.
  // Loops until stable so mixed edges like `'9'.` collapse fully.
  let prev: string;
  do {
    prev = value;
    value = value
      .replace(/^["'`]+/, '')
      .replace(/["'`]+$/, '')
      .replace(/^[.?!,;:]+/, '')
      .replace(/[.?!,;:]+$/, '');
  } while (value !== prev);

  // Whitespace collapses AFTER trimming so external spaces disappear, and
  // BEFORE the numeric pass so "1 , 234"-style text is judged as non-numeric.
  value = value.replace(/\s+/g, ' ').trim();
  value = stripThousands(value);

  return value.trim();
}

/** True when the whole (normalized) string is a plain float literal. */
function isNumeric(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value);
}

/** Fixed tolerance for comparing two numeric answers as floats. */
const NUMERIC_EPSILON = 1e-9;

/**
 * Compare a raw user submission with the stored accepted variants. Sequence
 * comparison first (exact normalized match), then a numeric fallback so
 * `8` / `8.0` / ` 8 ` style answers still agree.
 */
export function isAnswerCorrect(userAnswer: string, acceptedVariants: readonly string[]): boolean {
  const normalized = normalizeAnswer(userAnswer);
  for (const variant of acceptedVariants) {
    if (normalizeAnswer(variant) === normalized) return true;
  }

  if (isNumeric(normalized)) {
    const userValue = Number.parseFloat(normalized);
    for (const variant of acceptedVariants) {
      const variantValue = normalizeAnswer(variant);
      if (isNumeric(variantValue)) {
        const value = Number.parseFloat(variantValue);
        if (Math.abs(value - userValue) <= NUMERIC_EPSILON) return true;
      }
    }
  }
  return false;
}
