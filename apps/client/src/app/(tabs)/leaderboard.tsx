import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  xp: number;
  streak: number;
  isCurrentUser?: boolean;
}

const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, displayName: 'Elena Rostova', xp: 3420, streak: 28 },
  { rank: 2, displayName: 'Marcus Vance', xp: 2890, streak: 19 },
  { rank: 3, displayName: 'Sofia Chen', xp: 2410, streak: 14 },
  { rank: 4, displayName: 'Alex Rivers', xp: 1450, streak: 12, isCurrentUser: true },
  { rank: 5, displayName: 'Tariq Al-Mansoor', xp: 1320, streak: 9 },
  { rank: 6, displayName: 'Clara Dubois', xp: 1180, streak: 8 },
  { rank: 7, displayName: 'Liam O’Connor', xp: 950, streak: 5 },
  { rank: 8, displayName: 'Yuki Tanaka', xp: 820, streak: 4 },
];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'weekly' | 'allTime'>('allTime');

  const currentUserRank = 4;
  const currentUserXp = user?.xp ?? 1450;
  const currentUserStreak = user?.streak ?? 12;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: 'trophy', color: '#F59E0B', label: '1st' };
    if (rank === 2) return { icon: 'medal', color: '#94A3B8', label: '2nd' };
    if (rank === 3) return { icon: 'medal', color: '#B45309', label: '3rd' };
    return { icon: null, color: Colors.neutral[600], label: `#${rank}` };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TopBar title="Leaderboard" showStreak={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header & Tabs */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Global Ranking</Text>
          <Text style={styles.screenSub}>
            Compete with solvers globally and climb the XP tier.
          </Text>

          {/* Time Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                filter === 'allTime' && styles.filterPillActive,
              ]}
              onPress={() => setFilter('allTime')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'allTime' && styles.filterTextActive,
                ]}
              >
                All-Time XP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filter === 'weekly' && styles.filterPillActive,
              ]}
              onPress={() => setFilter('weekly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'weekly' && styles.filterTextActive,
                ]}
              >
                Weekly Sprint
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current User Rank Card */}
        <View style={styles.currentUserCard}>
          <View style={styles.userCardLeft}>
            <View style={styles.userRankCircle}>
              <Text style={styles.userRankNumber}>#{currentUserRank}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userLabel}>Your Standing</Text>
              <Text style={styles.userName}>{user?.displayName ?? 'Alex Rivers'}</Text>
            </View>
          </View>

          <View style={styles.userCardRight}>
            <View style={styles.scoreItem}>
              <Ionicons name="flash" size={16} color={Colors.warning} />
              <Text style={styles.scoreText}>{currentUserXp.toLocaleString()} XP</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.flameEmoji}>🔥</Text>
              <Text style={styles.streakText}>{currentUserStreak} streak</Text>
            </View>
          </View>
        </View>

        {/* Leaderboard Table List */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.colRank}>RANK</Text>
            <Text style={styles.colPlayer}>SOLVER</Text>
            <Text style={styles.colScore}>XP & STREAK</Text>
          </View>

          {SAMPLE_LEADERBOARD.map((item) => {
            const isUser = item.isCurrentUser;
            const rankBadge = getRankBadge(item.rank);

            return (
              <View
                key={item.rank}
                style={[
                  styles.tableRow,
                  isUser && styles.userTableRow,
                ]}
              >
                {/* Rank column */}
                <View style={styles.rankCol}>
                  {item.rank <= 3 ? (
                    <View style={[styles.topRankCircle, { backgroundColor: rankBadge.color + '20' }]}>
                      <Ionicons name="trophy" size={14} color={rankBadge.color} />
                    </View>
                  ) : (
                    <Text style={[styles.rankNumberText, isUser && styles.userRankNumberText]}>
                      #{item.rank}
                    </Text>
                  )}
                </View>

                {/* Player info */}
                <View style={styles.playerCol}>
                  <View style={[styles.avatarDot, isUser && styles.userAvatarDot]}>
                    <Text style={styles.avatarInitial}>
                      {item.displayName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.playerName, isUser && styles.userPlayerName]}>
                      {item.displayName}
                    </Text>
                    {isUser && <Text style={styles.youTag}>You</Text>}
                  </View>
                </View>

                {/* Score */}
                <View style={styles.scoreCol}>
                  <Text style={styles.xpText}>{item.xp.toLocaleString()} XP</Text>
                  <Text style={styles.subStreak}>{item.streak} 🔥</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
  },
  headerSection: {
    marginBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
  },
  screenSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[150],
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.semiBold,
  },
  filterTextActive: {
    color: Colors.secondary[800],
  },
  currentUserCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.secondary[800],
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.secondary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userRankCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRankNumber: {
    color: Colors.white,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  userInfo: {
    gap: 2,
  },
  userLabel: {
    color: Colors.secondary[300],
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  userName: {
    color: Colors.white,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  userCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  flameEmoji: {
    fontSize: 12,
  },
  streakText: {
    color: Colors.primary[300],
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semiBold,
  },
  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  colRank: {
    width: 50,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.bold,
  },
  colPlayer: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.bold,
  },
  colScore: {
    width: 100,
    textAlign: 'right',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.bold,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[150],
  },
  userTableRow: {
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    borderColor: Colors.primary[200],
    borderWidth: 1,
  },
  rankCol: {
    width: 50,
    justifyContent: 'center',
  },
  topRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.bold,
  },
  userRankNumberText: {
    color: Colors.primary[700],
  },
  playerCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[150],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarDot: {
    backgroundColor: Colors.primary[500],
  },
  avatarInitial: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
  },
  playerName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.semiBold,
  },
  userPlayerName: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  youTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary[600],
    fontFamily: Typography.fontFamily.bold,
  },
  scoreCol: {
    width: 100,
    alignItems: 'flex-end',
    gap: 2,
  },
  xpText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
  },
  subStreak: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.regular,
  },
});
