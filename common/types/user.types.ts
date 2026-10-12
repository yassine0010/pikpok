/**
 * PikPok - User Type Definitions
 *
 * Shared types for user profiles, stats, and leaderboard.
 */

import type { AudienceCategory } from './puzzle.types';

export interface UserProfile {
  id: string;
  displayName: string;
  audienceCategory: AudienceCategory;
  createdAt: string;
}

export interface UserStats {
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  dailyCompletions: number;
  hintsUsed: number;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalXp: number;
  currentStreak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser?: {
    rank: number;
    displayName: string;
    totalXp: number;
    currentStreak: number;
  };
}