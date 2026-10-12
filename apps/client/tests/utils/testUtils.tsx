/**
 * Test utilities and helpers
 */

import { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock providers wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const Wrapper = options.wrapper || createWrapper();
  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from RTL
export * from '@testing-library/react-native';

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  displayName: 'Test User',
  audienceCategory: 'CHILDREN' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

export const createMockPuzzle = (overrides = {}) => ({
  id: 'puzzle-001',
  contentVersion: 1,
  type: 'NUMBER_SEQUENCE' as const,
  domain: 'math' as const,
  difficultyRating: 1500,
  content: {
    prompt: 'What comes next?',
    sequence: [2, 4, 6, 8, null],
    displayFormat: ', ',
    inputPlaceholder: 'Enter number'
  },
  staticHints: [
    { tier: 1, type: 'guiding_question', content: 'What changes between each pair?' },
    { tier: 2, type: 'strategic_clue', content: 'The difference is constant' },
    { tier: 3, type: 'step_walkthrough', content: 'Add 2 each time: 2+2=4, 4+2=6, 6+2=8, 8+2=10' }
  ],
  ...overrides
});

export const createMockFeedResponse = (puzzles = [createMockPuzzle()]) => ({
  puzzles,
  nextBatchRequiredAt: 2
});

export const createMockStats = (overrides = {}) => ({
  totalAttempts: 10,
  correctAttempts: 7,
  accuracyPercent: 70,
  totalXp: 70,
  currentStreak: 3,
  longestStreak: 5,
  dailyCompletions: 4,
  hintsUsed: 2,
  ...overrides
});

export const createMockLeaderboard = (overrides = {}) => ({
  entries: [
    { rank: 1, displayName: 'Alice', totalXp: 500, currentStreak: 10 },
    { rank: 2, displayName: 'Bob', totalXp: 450, currentStreak: 8 },
    { rank: 3, displayName: 'Charlie', totalXp: 400, currentStreak: 5 }
  ],
  currentUser: { rank: 5, displayName: 'Test User', totalXp: 70, currentStreak: 3 },
  ...overrides
});

// Async utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock API responses
export function mockApiSuccess<T>(data: T): Promise<T> {
  return Promise.resolve(data);
}
export const mockApiError = (code: string, message: string, details?: any) =>
  Promise.reject({
    response: { ok: false, status: 400 },
    message,
    code,
    details
  });

// Accessibility test helpers
export const expectToBeAccessible = (element: any) => {
  expect(element).toBeTruthy();
  // Add more accessibility checks as needed
};

// Snapshot serialization helpers
export const serializeComponent = (component: ReactElement) => {
  const { toJSON } = renderWithProviders(component);
  return toJSON();
};