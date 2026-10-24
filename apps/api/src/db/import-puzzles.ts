import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../config.js';
import type { PuzzleDomain, PuzzleDifficultyLevel } from '../types/puzzles.js';
import { normalizeAnswer } from '../lib/answer.js';
import { pool } from './pool.js';

/**
 * One-shot importer for the M5 puzzle feed: reads the JSON question bank at
 * `config.puzzlesSourceDir` (`final_puzzles/<archetype>/<tier>/puzzle_NN.json`
 * with sibling PNGs), upserts catalog rows into the `puzzles` table and copies
 * each image into `config.puzzlesPublicDir` so `@fastify/static` can serve it.
 *
 * Idempotent: `ON CONFLICT (id) DO UPDATE` refreshes catalog content fields
 * only; `user_puzzle_solves` (player progress) is never touched. Re-running is
 * safe and expected whenever the source bank changes.
 *
 * Run with: `npm run db:import-puzzles`.
 */

interface SourceDict {
  [key: string]: unknown;
}

/** Source-dir archetype → feed domain (see the locked M5 wire contract). */
const DOMAIN_BY_ARCHETYPE: Record<string, PuzzleDomain> = {
  number_sequence: 'math',
  missing_operator: 'math',
  triangle_corner_rule: 'math',
  scheduling: 'logic',
  deduction: 'logic',
  hidden_rule_pyramid: 'logic',
  route: 'pattern',
};

/** Archetype → human label used when a puzzle has no theme title. */
const LABEL_BY_ARCHETYPE: Record<string, string> = {
  number_sequence: 'Number Sequence',
  missing_operator: 'Missing Operator',
  route: 'Route & Obstacles',
  triangle_corner_rule: 'Triangle Corner Rule',
  hidden_rule_pyramid: 'Hidden-Rule Number Pyramid',
};

const TIERS = ['easy', 'medium', 'hard'] as const;
type Tier = (typeof TIERS)[number];

const DIFFICULTY_LEVEL: Record<Tier, PuzzleDifficultyLevel> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

/** Human title when a puzzle carries no theme (scheduling/deduction only). */
function titleFor(
  archetype: string,
  theme: string | null,
  solutionData: SourceDict,
): string {
  if (theme !== null && theme !== '') return theme;
  const inSolution = solutionData['theme_title'];
  if (typeof inSolution === 'string' && inSolution.trim() !== '') return inSolution.trim();
  return LABEL_BY_ARCHETYPE[archetype] ?? archetype;
}

/**
 * Plain numeric form of a "purely numeric" answer: `1,234` → `1234`.
 * Returns null for anything else (whitespace/punctuation already common in
 * the response string is judged on its trimmed value).
 */
function plainNumericForm(value: string): string | null {
  const trimmed = value.trim();
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) return trimmed.replace(/,/g, '');
  return null;
}

/**
 * Accepted variants, normalized with the SAME normalizeAnswer the answer route
 * uses at runtime so stored forms and comparisons can never drift:
 *   1. the ground-truth `response` string;
 *   2. the typed duplicate when solution_data carries one
 *      (triangle_corner_rule → `response_value`, hidden_rule_pyramid → `answer`);
 *   3. the plain numeric form of each purely numeric candidate.
 * Deduplicated in insertion order (response form first).
 */
function variantsFor(archetype: string, response: string, solutionData: SourceDict): string[] {
  const typedKey =
    archetype === 'triangle_corner_rule'
      ? 'response_value'
      : archetype === 'hidden_rule_pyramid'
        ? 'answer'
        : null;
  const typedValue =
    typedKey !== null &&
    solutionData[typedKey] !== undefined &&
    solutionData[typedKey] !== null
      ? String(solutionData[typedKey])
      : null;

  const candidates = [response, typedValue !== null ? typedValue : null].filter(
    (value): value is string => value !== null,
  );

  const numeric = candidates.flatMap((value) => {
    const plain = plainNumericForm(value);
    return plain !== null && plain !== value ? [plain] : [];
  });

  return [...new Set([...candidates, ...numeric].map((value) => normalizeAnswer(value)))];
}

const UPSERT_SQL = `
  INSERT INTO puzzles
    (id, domain, difficulty, difficulty_level, title, prompt, hints,
     answer, accepted_variants, image_url, raw)
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11::jsonb)
  ON CONFLICT (id) DO UPDATE SET
    domain            = EXCLUDED.domain,
    difficulty        = EXCLUDED.difficulty,
    difficulty_level  = EXCLUDED.difficulty_level,
    title             = EXCLUDED.title,
    prompt            = EXCLUDED.prompt,
    hints             = EXCLUDED.hints,
    answer            = EXCLUDED.answer,
    accepted_variants = EXCLUDED.accepted_variants,
    image_url         = EXCLUDED.image_url,
    raw               = EXCLUDED.raw
`;

interface ParsedPuzzle {
  id: string;
  domain: PuzzleDomain;
  difficulty: Tier;
  difficultyLevel: PuzzleDifficultyLevel;
  title: string;
  prompt: string;
  hints: string[];
  answer: string;
  acceptedVariants: string[];
  imageUrl: string;
  raw: SourceDict;
  imageSource: string;
  imageDest: string;
}

async function parsePuzzle(
  archetype: string,
  tier: Tier,
  filePath: string,
  sourceRoot: string,
  publicDir: string,
): Promise<ParsedPuzzle> {
  const fileName = path.basename(filePath);
  const nn = fileName.match(/^puzzle_(\d+)\.json$/)?.[1];
  if (!nn) throw new Error(`Unexpected file name (want puzzle_NN.json): ${filePath}`);

  const raw = JSON.parse(await readFile(filePath, 'utf8')) as SourceDict;
  const { question, response, hints, image_path } = raw as {
    question?: string;
    response?: string;
    hints?: unknown;
    image_path?: string;
  };

  if (raw['puzzle_type'] !== archetype || raw['difficulty'] !== tier) {
    throw new Error(
      `Mismatched puzzle metadata in ${filePath}: expected puzzle_type=${archetype} ` +
        `difficulty=${tier}, got puzzle_type=${raw['puzzle_type'] as string} ` +
        `difficulty=${raw['difficulty'] as string}`,
    );
  }
  if (typeof question !== 'string' || question.trim() === '') {
    throw new Error(`Missing question text in ${filePath}`);
  }
  if (typeof response !== 'string' || response.trim() === '') {
    throw new Error(`Missing response (ground-truth answer) in ${filePath}`);
  }
  if (
    !Array.isArray(hints) ||
    hints.length > 5 ||
    hints.some((hint) => typeof hint !== 'string')
  ) {
    throw new Error(`hints must be a flat string array of at most 5 items in ${filePath}`);
  }

  const solutionData = (raw['solution_data'] ?? {}) as SourceDict;
  const theme = raw['theme'];
  const themeTitle =
    theme !== null && typeof theme === 'object' && typeof (theme as SourceDict)['title'] === 'string'
      ? (theme as SourceDict)['title'] as string
      : null;

  const image = typeof image_path === 'string' ? path.basename(image_path) : `puzzle_${nn}.png`;

  return {
    id: `${archetype}_${tier}_${nn.padStart(2, '0').toLowerCase()}`,
    domain: DOMAIN_BY_ARCHETYPE[archetype]!,
    difficulty: tier,
    difficultyLevel: DIFFICULTY_LEVEL[tier],
    title: titleFor(archetype, themeTitle, solutionData).slice(0, 80),
    prompt: question,
    hints: hints as string[],
    answer: response,
    acceptedVariants: variantsFor(archetype, response, solutionData),
    imageUrl: `/puzzles/images/${archetype}/${tier}/${image}`,
    raw,
    imageSource: path.join(path.dirname(filePath), image),
    imageDest: path.join(publicDir, archetype, tier, image),
  };
}

async function importPuzzles(sourceDir: string, publicDir: string): Promise<number> {
  const knownArchetypes = Object.keys(DOMAIN_BY_ARCHETYPE);
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const archetypes = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const unknown = archetypes.filter((name) => !knownArchetypes.includes(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown archetype directories in ${sourceDir}: ${unknown.join(', ')}`);
  }

  const parsed: ParsedPuzzle[] = [];
  for (const archetype of archetypes) {
    const archetypeDir = path.join(sourceDir, archetype);
    const tierDirs = (await readdir(archetypeDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name): name is Tier => (TIERS as readonly string[]).includes(name));

    for (const tier of tierDirs) {
      const files = (await readdir(path.join(archetypeDir, tier)))
        .filter((name) => name.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b));

      for (const file of files) {
        parsed.push(
          await parsePuzzle(
            archetype,
            tier,
            path.join(archetypeDir, tier, file),
            sourceDir,
            publicDir,
          ),
        );
      }
    }
  }

  await mkdir(publicDir, { recursive: true });

  // One transaction: the whole import is atomic, partial state never shows up.
  const client = await pool.connect();
  let imported = 0;
  try {
    await client.query('BEGIN');
    for (const puzzle of parsed) {
      // Copy first so a missing image aborts the run before any DB write.
      await mkdir(path.dirname(puzzle.imageDest), { recursive: true });
      await copyFile(puzzle.imageSource, puzzle.imageDest);

      await client.query(UPSERT_SQL, [
        puzzle.id,
        puzzle.domain,
        puzzle.difficulty,
        puzzle.difficultyLevel,
        puzzle.title,
        puzzle.prompt,
        JSON.stringify(puzzle.hints),
        puzzle.answer,
        JSON.stringify(puzzle.acceptedVariants),
        puzzle.imageUrl,
        JSON.stringify(puzzle.raw),
      ]);
      imported += 1;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return imported;
}

const isCli =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  importPuzzles(config.puzzlesSourceDir, config.puzzlesPublicDir)
    .then(async (count) => {
      const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM puzzles');
      console.log(`Imported ${count} puzzles from ${config.puzzlesSourceDir}`);
      console.log(`puzzles table now holds ${rows[0]?.count} rows`);
      await pool.end();
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
