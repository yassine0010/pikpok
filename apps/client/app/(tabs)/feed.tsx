import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type FeedPuzzle } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { PuzzleCard } from '@/components/puzzle/PuzzleCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useState, useCallback, useRef, useEffect } from 'react';

export default function FeedScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const feedEndRef = useRef<View>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeed(5),
    enabled: isAuthenticated,
    staleTime: 1000 * 30
  });

  const skipMutation = useMutation({
    mutationFn: ({ interactionId, puzzleId, contentVersion }: { interactionId: string; puzzleId: string; contentVersion: number }) =>
      api.skipPuzzle(interactionId, puzzleId, contentVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['feed'] });
    setRefreshing(false);
  }, [queryClient]);

  const handlePuzzleSkip = useCallback(
    (interactionId: string, puzzleId: string, contentVersion: number) => {
      skipMutation.mutate({ interactionId, puzzleId, contentVersion });
    },
    [skipMutation]
  );

  const puzzles = data?.puzzles || [];

  if (isLoading) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} style={styles.skeletonCard} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load puzzles"
        onRetry={refetch}
      />
    );
  }

  if (puzzles.length === 0) {
    return (
      <EmptyState
        title="No puzzles available"
        message="Check back later for new puzzles!"
        icon="puzzle-outline"
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
      }
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {puzzles.map((puzzle, index) => (
        <PuzzleCard
          key={`${puzzle.id}-${puzzle.contentVersion}`}
          puzzle={puzzle}
          index={index}
          onSkip={handlePuzzleSkip}
        />
      ))}
      <View ref={feedEndRef} style={styles.feedEnd} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    minHeight: '100%'
  },
  skeletonCard: {
    marginBottom: Spacing.md,
    borderRadius: 16,
    height: 280
  },
  feedEnd: {
    height: 100
  }
});