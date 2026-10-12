/**
 * PikPok - User Type Definitions
 *
 * Shared types for user profiles, stats, and leaderboard.
 */

export type AudienceCategory = 'CHILDREN' | 'TEENS';

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

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

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

export interface UpdateProfileRequest {
  displayName: string;
}