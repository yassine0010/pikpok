import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <LoadingSkeleton style={styles.skeletonStat} />
          <LoadingSkeleton style={styles.skeletonStat} />
        </View>
        <View style={styles.section}>
          <LoadingSkeleton style={styles.skeletonStat} />
          <LoadingSkeleton style={styles.skeletonStat} />
        </View>
        <View style={styles.section}>
          <LoadingSkeleton style={styles.skeletonStat} />
          <LoadingSkeleton style={styles.skeletonStat} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load statistics"
        onRetry={handleRefresh}
      />
    );
  }

  const stats = data!;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
      }
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Overview</Text>
      </View>

      <View style={styles.section}>
        <StatCard
          label="Total XP"
          value={stats.totalXp.toLocaleString()}
          icon="flash"
          iconColor={Colors.warning}
          trend={{ value: '+10 today', positive: true }}
        />
        <StatCard
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          icon="flame"
          iconColor={Colors.error}
          trend={stats.currentStreak > 0 ? { value: `Best: ${stats.longestStreak} days`, positive: true } : undefined}
        />
      </View>

      <View style={styles.section}>
        <StatCard
          label="Accuracy"
          value={`${stats.accuracyPercent.toFixed(1)}%`}
          icon="checkmark-circle"
          iconColor={Colors.success}
          trend={stats.totalAttempts > 0 ? { value: `${stats.correctAttempts}/${stats.totalAttempts} correct`, positive: true } : undefined}
        />
        <StatCard
          label="Total Attempts"
          value={stats.totalAttempts.toLocaleString()}
          icon="analytics"
          iconColor={Colors.info}
          trend={stats.dailyCompletions > 0 ? { value: `${stats.dailyCompletions} days active`, positive: true } : undefined}
        />
      </View>

      <View style={styles.section}>
        <StatCard
          label="Longest Streak"
          value={`${stats.longestStreak} days`}
          icon="trophy"
          iconColor={Colors.warning}
        />
        <StatCard
          label="Hints Used"
          value={stats.hintsUsed.toLocaleString()}
          icon="bulb"
          iconColor={Colors.info}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Progress</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Weekly Activity</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '73%' }]} />
          </View>
          <Text style={styles.progressValue}>5/7 days</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Monthly Goal</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '42%' }]} />
          </View>
          <Text style={styles.progressValue}>12/30 puzzles</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>By Domain</Text>
      </View>

      <View style={styles.domainGrid}>
        {([
          { domain: 'Math', icon: 'calculator', color: Colors.primary, accuracy: 78, count: 45 },
          { domain: 'Logic', icon: 'extension-puzzle', color: Colors.secondary, accuracy: 82, count: 38 },
          { domain: 'Spatial', icon: 'cube', color: Colors.tertiary, accuracy: 65, count: 22 },
          { domain: 'Pattern', icon: 'grid', color: Colors.quaternary, accuracy: 71, count: 31 },
          { domain: 'Deduction', icon: 'search', color: Colors.quinary, accuracy: 88, count: 19 }
        ] as const).map((item) => (
          <View key={item.domain} style={styles.domainCard}>
            <View style={[styles.domainIconContainer, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.domainName}>{item.domain}</Text>
            <Text style={[styles.domainAccuracy, { color: item.color }]}>{item.accuracy}%</Text>
            <Text style={styles.domainCount}>{item.count} puzzles</Text>
          </View>
        ))}
      </View>
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
  header: {
    paddingBottom: Spacing.sm
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary
  },
  skeletonStat: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    marginHorizontal: Spacing.xs
  },
  progressSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg
  },
  progressItem: {
    gap: Spacing.xs
  },
  progressLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4
  },
  progressValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'right'
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm
  },
  domainCard: {
    width: '31%',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs
  },
  domainIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  domainName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary
  },
  domainAccuracy: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold
  },
  domainCount: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  }
});