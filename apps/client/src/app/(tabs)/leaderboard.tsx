import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/context/AuthContext';
import {
  ApiError,
  fetchLeaderboard,
  formatAuthError,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type LeaderboardSelf,
} from '@/api/client';
import { getAuthToken } from '@/api/tokenStorage';
import { Ionicons } from '@expo/vector-icons';

/** Matches the API's documented default page size. */
const LEADERBOARD_LIMIT = 50;

type LeaderboardStatus = 'loading' | 'ready' | 'error';

export default function LeaderboardScreen() {
  const { user, isAuthenticated, isLoading: isRestoringSession } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<'weekly' | 'allTime'>('allTime');
  const [status, setStatus] = useState<LeaderboardStatus>('loading');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // Set when the leaderboard responded 401 (expired session) or the stored
  // session is out of sync — we show a sign-in prompt instead of a raw error.
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Guards against out-of-order responses when focus events stack up.
  const requestSeqRef = useRef(0);
  // Mirrors whether `data` holds a successful load, so focus refetches can
  // refresh quietly instead of blanking the screen with a spinner.
  const hasDataRef = useRef(false);

  /**
   * Loads the leaderboard.
   * - 'block':  show the full loading state (used on first load and retry)
   * - 'quiet':  keep current content on screen (silent background refresh)
   * - 'refresh': drive the pull-to-refresh spinner
   */
  const runFetch = useCallback(
    async (presentation: 'block' | 'quiet' | 'refresh') => {
      if (!isAuthenticated) {
        // Guest browsing — never hit the authed endpoint, just clear state.
        hasDataRef.current = false;
        setData(null);
        setNeedsSignIn(false);
        setStatus('ready');
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        // Context says signed-in but no token is stored — treat as a guest.
        hasDataRef.current = false;
        setData(null);
        setNeedsSignIn(true);
        setStatus('ready');
        return;
      }

      const seq = ++requestSeqRef.current;
      if (presentation === 'block') setStatus('loading');
      if (presentation === 'refresh') setRefreshing(true);

      try {
        const result = await fetchLeaderboard(token, LEADERBOARD_LIMIT);
        if (seq !== requestSeqRef.current) return; // superseded
        hasDataRef.current = true;
        setData(result);
        setNeedsSignIn(false);
        setErrorMessage('');
        setStatus('ready');
      } catch (error) {
        if (seq !== requestSeqRef.current) return; // superseded
        const unauthorized =
          error instanceof ApiError &&
          (error.status === 401 || error.code === 'UNAUTHORIZED');
        if (unauthorized) {
          // Expired/invalid token — invite the user to sign in again instead
          // of surfacing a scary error. (We deliberately don't force a global
          // sign-out from this screen.)
          hasDataRef.current = false;
          setData(null);
          setNeedsSignIn(true);
          setErrorMessage('');
          setStatus('ready');
        } else {
          setErrorMessage(
            formatAuthError(
              error,
              'Couldn’t load the leaderboard right now. Please try again.'
            )
          );
          setStatus('error');
        }
      } finally {
        if (seq === requestSeqRef.current) setRefreshing(false);
      }
    },
    [isAuthenticated]
  );

  // Refetch on mount and every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      runFetch(hasDataRef.current ? 'quiet' : 'block');
    }, [runFetch])
  );

  const showSignInPrompt = !isRestoringSession && (!isAuthenticated || needsSignIn);
  const effectiveStatus: LeaderboardStatus = isRestoringSession ? 'loading' : status;

  const isEntryUser = (item: LeaderboardEntry) =>
    !!user &&
    (item.id ? item.id === user.id : item.displayName === user.displayName);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: 'trophy', color: '#F59E0B', label: '1st' };
    if (rank === 2) return { icon: 'medal', color: '#94A3B8', label: '2nd' };
    if (rank === 3) return { icon: 'medal', color: '#B45309', label: '3rd' };
    return { icon: null, color: Colors.neutral[600], label: `#${rank}` };
  };

  const renderSignInPrompt = () => (
    <View style={styles.stateCard}>
      <View style={styles.stateIconCircle}>
        <Ionicons name="trophy-outline" size={26} color={Colors.primary[500]} />
      </View>
      <Text style={styles.stateTitle}>See the global ranking</Text>
      <Text style={styles.stateSubtitle}>
        Sign in to compare your XP with solvers worldwide and track your
        standing on the board.
      </Text>
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => router.push('/auth/login')}
        activeOpacity={0.85}
      >
        <Text style={styles.signInButtonText}>Sign In</Text>
        <Ionicons name="arrow-forward" size={18} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.stateCard}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={styles.stateSubtitle}>Loading rankings…</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.stateCard}>
      <View style={styles.stateIconCircle}>
        <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
      </View>
      <Text style={styles.stateTitle}>Couldn’t load the leaderboard</Text>
      <Text style={styles.stateSubtitle}>{errorMessage}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => runFetch('block')}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={16} color={Colors.white} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.stateCard}>
      <View style={styles.stateIconCircle}>
        <Ionicons name="people-outline" size={26} color={Colors.neutral[500]} />
      </View>
      <Text style={styles.stateTitle}>No rankings yet</Text>
      <Text style={styles.stateSubtitle}>
        Solve puzzles to earn XP and be the first name on the board.
      </Text>
    </View>
  );

  const renderWeeklySoon = () => (
    <View style={styles.stateCard}>
      <View style={styles.soonPill}>
        <Ionicons name="time-outline" size={12} color={Colors.tertiary[700]} />
        <Text style={styles.soonPillText}>Coming Soon</Text>
      </View>
      <View style={styles.stateIconCircle}>
        <Ionicons name="calendar-outline" size={26} color={Colors.tertiary[600]} />
      </View>
      <Text style={styles.stateTitle}>Weekly Sprint is warming up</Text>
      <Text style={styles.stateSubtitle}>
        XP earned per week isn’t tracked yet, so there’s no honest ranking to
        show here. The sprint leaderboard arrives in a future milestone.
      </Text>
    </View>
  );

  const renderStanding = (me: LeaderboardSelf) => (
    <View style={styles.currentUserCard}>
      <View style={styles.userCardLeft}>
        <View style={styles.userRankCircle}>
          <Text style={styles.userRankNumber}>#{me.rank}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Your Standing</Text>
          <Text style={styles.userName}>{me.displayName || 'You'}</Text>
        </View>
      </View>

      <View style={styles.userCardRight}>
        <View style={styles.scoreItem}>
          <Ionicons name="flash" size={16} color={Colors.warning} />
          <Text style={styles.scoreText}>{me.xp.toLocaleString()} XP</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.flameEmoji}>🔥</Text>
          <Text style={styles.streakText}>{me.streak} streak</Text>
        </View>
      </View>
    </View>
  );

  const renderTable = (entries: LeaderboardEntry[]) => (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={styles.colRank}>RANK</Text>
        <Text style={styles.colPlayer}>SOLVER</Text>
        <Text style={styles.colScore}>XP & STREAK</Text>
      </View>

      {entries.map((item) => {
        // Highlight the real signed-in user's row by id (display-name fallback).
        const isUser = isEntryUser(item);
        const rankBadge = getRankBadge(item.rank);

        return (
          <View
            key={item.id || `rank-${item.rank}`}
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
  );

  const renderAllTime = () => {
    if (showSignInPrompt) return renderSignInPrompt();
    if (effectiveStatus === 'loading') return renderLoading();
    if (effectiveStatus === 'error') return renderError();

    const entries = data?.entries ?? [];
    return (
      <>
        {/* Real standing from `me`; prompt instead of fake data when absent. */}
        {data?.me ? renderStanding(data.me) : renderSignInPrompt()}

        {entries.length > 0 ? (
          <>
            {data && data.total > 0 && (
              <View style={styles.tableCaptionRow}>
                <Text style={styles.tableCaption}>
                  {data.total.toLocaleString()} solvers worldwide
                </Text>
              </View>
            )}
            {renderTable(entries)}
          </>
        ) : (
          renderEmpty()
        )}
      </>
    );
  };

  const handleRefresh = () => {
    if (!showSignInPrompt) runFetch('refresh');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TopBar title="Leaderboard" showStreak={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
            enabled={!showSignInPrompt && filter === 'allTime'}
          />
        }
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

        {filter === 'weekly' ? renderWeeklySoon() : renderAllTime()}
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
  stateCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stateIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stateTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary[500],
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  signInButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Typography.fontFamily.bold,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary[800],
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Typography.fontFamily.bold,
  },
  soonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tertiary[50],
    borderWidth: 1,
    borderColor: Colors.tertiary[200],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  soonPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.tertiary[700],
    fontFamily: Typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCaptionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  tableCaption: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.medium,
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
