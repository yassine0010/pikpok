/**
 * PikPok - Puzzle Generation Engine Type Definitions
 * 
 * These types define the data contract for all puzzles produced
 * by the generation engine and ingested by the PikPok backend catalog.
 */

/**
 * Active v1 audience categories.
 *
 * Neurodivergent audience modeling is deferred to M7. See
 * `common/types/future/neurodivergent.types.ts` for the isolated future contract.
 */
export type AudienceCategory = 'CHILDREN' | 'TEENS';

export type PuzzleType =
  | 'NUMBER_SEQUENCE'
  | 'MISSING_OPERATOR'
  | 'SCHEDULING_ORDER'
  | 'ONE_TRUE_STATEMENT'
  | 'CONSTRAINED_ROUTE';

export type DomainCategory =
  | 'math'
  | 'logic'
  | 'spatial'
  | 'pattern'
  | 'deduction';

export type HintTier = 1 | 2 | 3;
export type HintType = 'guiding_question' | 'strategic_clue' | 'step_walkthrough';

export interface StaticHint {
  tier: HintTier;
  type: HintType;
  content: string;
}

/**
 * Universal Certified Puzzle Model
 */
export interface GeneratedPuzzle<
  TContent = unknown,
  TVerification = unknown,
  TMetadata = unknown
> {
  id: string;
  contentVersion: number;
  type: PuzzleType;
  domain: DomainCategory;
  /** Glicko-compatible rating on the shared 1500-centered scale; valid range is 400-2800. */
  difficultyRating: number;
  difficultyMetadata: TMetadata;
  ageFloor: number;
  ageCeiling: number;
  audienceCategories: AudienceCategory[];
  fingerprintHash: string;
  content: TContent;
  verification: TVerification;
  staticHints: StaticHint[];
  createdAt: string;
}

// ============================================================================
// 1. Number Sequence
// ============================================================================

export interface NumberSequenceContent {
  prompt: string;
  sequence: (number | null)[];
  displayFormat: string;
  inputPlaceholder: string;
}

export interface NumberSequenceVerification {
  canonicalAnswer: number;
  acceptedAnswers: string[];
  ruleDescription: string;
  formula?: string;
}

export interface NumberSequenceMetadata {
  formulaComplexity: number;
  operandSize: number;
  exampleCount: number;
  ruleName: string;
  step?: number;
}

export type NumberSequencePuzzle = GeneratedPuzzle<
  NumberSequenceContent,
  NumberSequenceVerification,
  NumberSequenceMetadata
>;

// ============================================================================
// 2. Missing Numbers or Operators
// ============================================================================

export interface MissingOperatorContent {
  prompt: string;
  equation: string;
  allowedSymbols: string[];
  inputPlaceholder: string;
}

export interface MissingOperatorVerification {
  canonicalAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
}

export interface MissingOperatorMetadata {
  stepCount: number;
  operatorComplexity: number;
  missingType: 'operator' | 'number';
  operandMagnitude: number;
}

export type MissingOperatorPuzzle = GeneratedPuzzle<
  MissingOperatorContent,
  MissingOperatorVerification,
  MissingOperatorMetadata
>;

// ============================================================================
// 3. Scheduling / Order
// ============================================================================

export interface SchedulingItem {
  id: string;
  label: string;
}

export interface SchedulingOrderContent {
  prompt: string;
  items: SchedulingItem[];
  clues: string[];
  inputPlaceholder: string;
}

export interface SchedulingOrderVerification {
  canonicalOrder: string[];
  acceptedAnswers: string[];
  deductionChain: string[];
  uniqueSolutionVerified: boolean;
}

export interface SchedulingOrderMetadata {
  itemCount: number;
  constraintComplexity: number;
  items: string[];
}

export type SchedulingOrderPuzzle = GeneratedPuzzle<
  SchedulingOrderContent,
  SchedulingOrderVerification,
  SchedulingOrderMetadata
>;

// ============================================================================
// 4. One-True-Statement Deduction
// ============================================================================

export interface StatementItem {
  label: string;
  text: string;
}

export interface OneTrueStatementContent {
  scenario: string;
  statements: StatementItem[];
  question: string;
  inputPlaceholder: string;
}

export interface OneTrueStatementVerification {
  canonicalAnswer: string;
  acceptedAnswers: string[];
  analysisPerLocation: Record<string, { trueStatements: string[]; valid: boolean }>;
  uniqueSolutionVerified: boolean;
}

export interface OneTrueStatementMetadata {
  entityCount: number;
  inferenceDepth: number;
  truthRule: 'EXACTLY_ONE_TRUE';
}

export type OneTrueStatementPuzzle = GeneratedPuzzle<
  OneTrueStatementContent,
  OneTrueStatementVerification,
  OneTrueStatementMetadata
>;

// ============================================================================
// 5. Constrained Route Planning
// ============================================================================

export interface RouteGrid {
  rows: number;
  cols: number;
  cells: string[][]; // "S", "E", ".", "#"
}

export interface ConstrainedRouteContent {
  prompt: string;
  grid: RouteGrid;
  legend: Record<string, string>;
  inputPlaceholder: string;
}

export interface Coordinate {
  r: number;
  c: number;
}

export interface ConstrainedRouteVerification {
  minimumMoves: number;
  acceptedAnswers: string[];
  canonicalPathCoordinates: Coordinate[];
  bfsDistanceVerified: boolean;
}

export interface ConstrainedRouteMetadata {
  gridRows: number;
  gridCols: number;
  gridSize: number;
  obstacleCount: number;
  branchPoints: number;
}

export type ConstrainedRoutePuzzle = GeneratedPuzzle<
  ConstrainedRouteContent,
  ConstrainedRouteVerification,
  ConstrainedRouteMetadata
>;
