import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalXp: number;
  currentStreak: number;
}

export default function LeaderboardScreen() {
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.getLeaderboard(50),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} style={styles.skeletonRow} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load leaderboard"
        onRetry={handleRefresh}
      />
    );
  }

  const entries = data?.entries || [];
  const currentUser = data?.currentUser;

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = currentUser && item.rank === currentUser.rank && item.displayName === currentUser.displayName;
    return (
      <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
        <View style={styles.rankContainer}>
          {item.rank <= 3 ? (
            <Ionicons
              name={item.rank === 1 ? 'medal' : item.rank === 2 ? 'medal-outline' : 'podium'}
              size={24}
              color={item.rank === 1 ? Colors.warning : item.rank === 2 ? Colors.textTertiary : Colors.tertiary}
            />
          ) : (
            <Text style={[styles.rankText, { color: isCurrentUser ? Colors.primary : Colors.textSecondary }]}>
              #{item.rank}
            </Text>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.nameText, isCurrentUser && styles.currentUserName]}>
            {item.displayName}
            {isCurrentUser && <Text style={styles.youBadge}>You</Text>}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={16} color={Colors.warning} />
            <Text style={styles.statText}>{item.totalXp.toLocaleString()} XP</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color={Colors.error} />
            <Text style={styles.statText}>{item.currentStreak}🔥</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
      }
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {currentUser && (
        <View style={styles.currentUserSummary}>
          <Text style={styles.summaryLabel}>Your Rank</Text>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryRank}>#{currentUser.rank}</Text>
            <View style={styles.summaryStats}>
              <Text style={styles.summaryStat}>
                <Ionicons name="flash" size={16} color={Colors.warning} />
                <Text style={styles.summaryStatText}>{currentUser.totalXp.toLocaleString()} XP</Text>
              </Text>
              <Text style={styles.summaryStat}>
                <Ionicons name="flame" size={16} color={Colors.error} />
                <Text style={styles.summaryStatText}>{currentUser.currentStreak}🔥</Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderRank}>Rank</Text>
        <Text style={styles.listHeaderName}>Name</Text>
        <Text style={styles.listHeaderStats}>XP / Streak</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.rank}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
            <Text style={styles.emptySubtext}>Be the first to solve puzzles!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    paddingBottom: Spacing.xl * 2
  },
  skeletonRow: {
    height: 60,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.md
  },
  currentUserSummary: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30'
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
    marginBottom: Spacing.xs
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryRank: {
    fontSize: Typography.fontSize.xl * 2,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary
  },
  summaryStats: {
    flexDirection: 'row',
    gap: Spacing.lg
  },
  summaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  summaryStatText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary
  },
  listHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs
  },
  listHeaderRank: {
    width: 50,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  listHeaderName: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  listHeaderStats: {
    width: 120,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.sm
  },
  currentUserRow: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30'
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rankText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold
  },
  nameContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md
  },
  nameText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center'
  },
  currentUserName: {
    color: Colors.primary
  },
  youBadge: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: 120,
    justifyContent: 'flex-end'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  statText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 3
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md
  },
  emptySubtext: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  }
});