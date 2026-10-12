/**
 * PikPok - API Type Definitions
 *
 * Shared request/response shapes and error codes for the API.
 */

import type { GeneratedPuzzle, StaticHint, PuzzleType, DomainCategory, AudienceCategory } from './puzzle.types';
import type { UserProfile, UserStats, LeaderboardResponse } from './user.types';

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: ApiError;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'PUZZLE_NOT_FOUND'
  | 'SCOPE_NOT_FOUND'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'PUZZLE_CONTENT_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNSUPPORTED_AUDIENCE_CATEGORY'
  | 'QUEUE_UNAVAILABLE'
  | 'VERIFIER_NOT_CONFIGURED'
  | 'INTERNAL_ERROR';

export interface ExpiredContentDetails {
  puzzleId: string;
  currentContentVersion: number;
}

// ============================================================================
// Auth Routes
// ============================================================================

export interface SignupRequest {
  displayName: string;
  email: string;
  password: string;
  audienceCategory: AudienceCategory;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthSuccessResponse {
  token: string;
  user: UserProfile;
}

// ============================================================================
// Feed Routes
// ============================================================================

export interface FeedRequest {
  size?: number; // 1-10, default 5
}

export interface FeedPuzzle {
  id: string;
  contentVersion: number;
  type: PuzzleType;
  domain: DomainCategory;
  difficultyRating: number;
  content: GeneratedPuzzle['content'];
  staticHints: StaticHint[];
}

export interface FeedResponse {
  puzzles: FeedPuzzle[];
  nextBatchRequiredAt: number;
}

export interface SkipRequest {
  interactionId: string;
  puzzleId: string;
  contentVersion: number;
}

export interface SkipResponse {
  interactionId: string;
  puzzleId: string;
  result: 'skipped';
  xpAwarded: 0;
}

// ============================================================================
// Answer Routes
// ============================================================================

export interface AnswerRequest {
  interactionId: string;
  puzzleId: string;
  contentVersion: number;
  submittedAnswer: string;
  elapsedTimeMs?: number;
  staticHintsUsed?: number;
}

export interface AnswerResponse {
  interactionId: string;
  puzzleId: string;
  result: 'correct' | 'incorrect';
  xpAwarded: number;
  currentStreak: number;
}

// ============================================================================
// Hint Routes
// ============================================================================

export interface HintRequest {
  contentVersion: number;
  tier: 1 | 2 | 3;
}

export interface HintResponse {
  puzzleId: string;
  contentVersion: number;
  hint: StaticHint;
}

// ============================================================================
// Stats, Leaderboard, Profile Routes
// ============================================================================

export interface StatsResponse extends UserStats {}

export interface LeaderboardRequest {
  limit?: number; // 1-100, default 50
}

export interface LeaderboardResponse extends LeaderboardResponse {}

export interface ProfileResponse extends UserProfile {}

export interface UpdateProfileRequest {
  displayName: string;
}

export interface UpdateProfileResponse extends UserProfile {}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthResponse {
  status: 'ok';
}