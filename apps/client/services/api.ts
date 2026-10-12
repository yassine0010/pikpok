import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import type { GeneratedPuzzle, StaticHint } from '@common/types/puzzle.types';
import type { UserProfile, UserStats, LeaderboardResponse } from '@common/types/user.types';

const API_BASE_URL = __DEV__
  ? Platform.select({ ios: 'http://localhost:3000', android: 'http://10.0.2.2:3000', web: 'http://localhost:3000' })
  : 'https://api.pikpok.local';

const TOKEN_KEY = 'pikpok_auth_token';

class ApiClient {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async getStoredToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async setStoredToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  }

  async clearStoredToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).code = errorData.error?.code;
      (error as any).details = errorData.error?.details;
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signup(
    displayName: string,
    email: string,
    password: string,
    audienceCategory: 'CHILDREN' | 'TEENS'
  ): Promise<{ token: string; user: UserProfile }> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ displayName, email, password, audienceCategory })
    });
  }

  // Profile
  async getProfile(): Promise<UserProfile> {
    return this.request('/profile');
  }

  async updateProfile(displayName: string): Promise<UserProfile> {
    return this.request('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName })
    });
  }

  // Feed
  async getFeed(size = 5): Promise<{ puzzles: FeedPuzzle[]; nextBatchRequiredAt: number }> {
    return this.request(`/feed?size=${size}`);
  }

  async skipPuzzle(interactionId: string, puzzleId: string, contentVersion: number): Promise<SkipResponse> {
    return this.request('/feed/skip', {
      method: 'POST',
      body: JSON.stringify({ interactionId, puzzleId, contentVersion })
    });
  }

  // Answer
  async submitAnswer(
    interactionId: string,
    puzzleId: string,
    contentVersion: number,
    submittedAnswer: string,
    elapsedTimeMs?: number,
    staticHintsUsed?: number
  ): Promise<AnswerResponse> {
    return this.request('/answer', {
      method: 'POST',
      body: JSON.stringify({ interactionId, puzzleId, contentVersion, submittedAnswer, elapsedTimeMs, staticHintsUsed })
    });
  }

  // Hints
  async getHint(puzzleId: string, contentVersion: number, tier: 1 | 2 | 3): Promise<HintResponse> {
    return this.request(`/hints/${puzzleId}?contentVersion=${contentVersion}&tier=${tier}`);
  }

  // Stats
  async getStats(): Promise<UserStats> {
    return this.request('/stats');
  }

  // Leaderboard
  async getLeaderboard(limit = 50): Promise<LeaderboardResponse> {
    return this.request(`/leaderboard?limit=${limit}`);
  }

  // Health
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }
}

// Feed puzzle type (excludes verification, audienceCategories, ageFloor, ageCeiling, fingerprintHash)
export interface FeedPuzzle {
  id: string;
  contentVersion: number;
  type: GeneratedPuzzle['type'];
  domain: GeneratedPuzzle['domain'];
  difficultyRating: number;
  content: GeneratedPuzzle['content'];
  staticHints: StaticHint[];
}

export interface SkipResponse {
  interactionId: string;
  puzzleId: string;
  result: 'skipped';
  xpAwarded: 0;
}

export interface AnswerResponse {
  interactionId: string;
  puzzleId: string;
  result: 'correct' | 'incorrect';
  xpAwarded: number;
  currentStreak: number;
}

export interface HintResponse {
  puzzleId: string;
  contentVersion: number;
  hint: StaticHint;
}

export const api = new ApiClient();