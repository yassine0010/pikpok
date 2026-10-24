/**
 * M7 — Daily Challenge tab.
 *
 * One featured puzzle per UTC day, served by GET /puzzles/daily (see
 * src/api/puzzles.ts). The screen follows the Feed blueprint
 * (docs/ui/README.md §3.1): coral canvas, TopBar with the live streak pill,
 * and the featured puzzle rendered through the EXISTING `PuzzleCard`
 * component in Daily mode (Daily badge, pager chrome hidden).
 *
 * - Fetch-on-focus with the same block/quiet + sequence-guard pattern as
 *   `(tabs)/feed.tsx` (first load blocks with a spinner; later refocuses
 *   refresh silently while data is on screen).
 * - `DAILY_UNAVAILABLE` (404, or a 200 body without a usable card) is treated
 *   distinctly from transport failures: a friendly "not available yet" card,
 *   since retrying cannot make a puzzle appear.
 * - A self-contained one-second countdown chip shows `Resets in HH:MM:SS`
 *   against `nextResetAt` (absolute instants only — display happens in the
 *   local format but the reset moment needs no timezone math). At 00:00 UTC
 *   the state reconciles on the next focus refetch; nothing more clever.
 * - When today's puzzle is solved (server-reported, or solved live via
 *   `PuzzleCard`'s `onSolvedToday`), a one-shot green "Completed for today"
 *   banner pops above the card — same single-spring approach as the M6
 *   `XpGainPill`, skipped under Reduce Motion, no loops. Streak text reads
 *   the authoritative value (live-solve callback result, falling back to the
 *   AuthContext streak that PuzzleCard's syncXp already keeps current).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  LayoutChangeEvent,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { PuzzleCard } from '@/components/PuzzleCard';
import { ApiError, formatAuthError } from '@/api/client';
import {
  fetchDailyPuzzle,
  type PuzzleCard as PuzzleCardData,
  type AnswerResult,
} from '@/api/puzzles';
import { getAuthToken } from '@/api/tokenStorage';
import { useAuth } from '@/context/AuthContext';

type DailyStatus = 'loading' | 'unavailable' | 'error' | 'ready';

const AppStatusBar = StatusBar as any;

/**
 * Floor for the featured card's height inside the scroll area. The card's
 * stage content needs roughly this much vertical room; shorter viewports
 * simply scroll to see the rest.
 */
const MIN_CARD_HEIGHT = 640;

/** Formats remaining milliseconds as `Resets in HH:MM:SS`, clamped at 00. */
function formatResetCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Resets in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * The ticking "Resets in HH:MM:SS" chip. Deliberately self-contained: it owns
 * the single one-second `setInterval` and its own state, so every tick
 * re-renders only this text node and never the puzzle card. The interval is
 * cleared on unmount and whenever `nextResetAt` changes (i.e. on refetch).
 * Countdown math uses absolute instants (`Date.now()` vs
 * `Date.parse(nextResetAt)` — both epoch-based, timezone-agnostic); when the
 * epoch target is missing/unparseable the chip simply doesn't render.
 */
function ResetCountdown({ nextResetAt }: { nextResetAt: string }) {
  // Label held in state (not a shortcut prop) so a tick only updates this
  // component's text node. `null` until the first effect tick.
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const targetMs = new Date(nextResetAt).getTime();
      if (!Number.isFinite(targetMs)) {
        setLabel(null); // Missing target instant — hide the chip.
        return;
      }
      setLabel(formatResetCountdown(targetMs - Date.now()));
    };
    update(); // Immediate first tick — no one-second "lag" on entry.
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextResetAt]);

  if (!label) return null;

  return (
    <View style={styles.resetChip}>
      <Ionicons name="time-outline" size={14} color={Colors.white} />
      <Text style={styles.resetChipText}>{label}</Text>
    </View>
  );
}

/**
 * M7 — "Completed for today" celebration banner. ONE-SHOT pop (opacity 0→1 +
 * scale 0.75→1, one gentle spring) mirroring PuzzleCard's `XpGainPill`:
 * skipped entirely (instant appearance) under Reduce Motion, no loops, and
 * the animation is stopped on unmount. Not a takeover — the card below stays
 * readable with its solved feedback row.
 */
function CompletedBanner({ streak }: { streak: number }) {
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          pop.setValue(1);
          return;
        }
        animation = Animated.spring(pop, {
          toValue: 1,
          speed: 18,
          bounciness: 6,
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (!cancelled) pop.setValue(1);
      });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [pop]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: pop,
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
          ],
        },
      ]}
      accessibilityLabel={`Daily challenge completed for today. Streak ${streak}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bannerTitleRow}>
        <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
        <Text style={styles.bannerTitle}>Completed for today</Text>
      </View>
      <View style={styles.bannerStreakPill}>
        <Text style={styles.bannerStreakText}>{`🔥 ${streak}`}</Text>
      </View>
    </Animated.View>
  );
}

export default function DailyScreen() {
  const { user } = useAuth();

  const [status, setStatus] = useState<DailyStatus>('loading');
  const [dailyCard, setDailyCard] = useState<PuzzleCardData | null>(null);
  const [solvedToday, setSolvedToday] = useState(false);
  const [nextResetAt, setNextResetAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  /** Streak snapshot from the live-solve callback (server-authoritative). */
  const [solvedStreak, setSolvedStreak] = useState<number | null>(null);

  // Viewport height of the card scroll area (measured, like feed's stage).
  const [cardAreaHeight, setCardAreaHeight] = useState(0);

  // Guards against out-of-order responses when focus events stack up.
  const requestSeqRef = useRef(0);
  // Mirrors whether `dailyCard` holds a successful load, so focus refetches
  // can refresh quietly instead of blanking the screen with a spinner.
  const hasDataRef = useRef(false);

  const clearDailyState = () => {
    hasDataRef.current = false;
    setDailyCard(null);
    setSolvedToday(false);
    setNextResetAt('');
    setSolvedStreak(null);
  };

  /**
   * Loads the daily puzzle through the M7 API module.
   * - 'block': show the loading state (first load and retry)
   * - 'quiet': keep the current card on screen (silent refresh to reconcile
   *   `solvedToday` after solve elsewhere — e.g. via the Feed or from the
   *   previous UTC day rolling over).
   */
  const runFetch = useCallback(async (presentation: 'block' | 'quiet') => {
    if (presentation === 'block') setStatus('loading');

    const seq = ++requestSeqRef.current;
    try {
      const token = await getAuthToken();
      if (seq !== requestSeqRef.current) return; // superseded
      if (!token) {
        // Auth gating upstream should guarantee a token; a missing/expired
        // one is surfaced as the regular error state with friendly copy.
        clearDailyState();
        setErrorMessage('Please sign in to play the daily challenge.');
        setStatus('error');
        return;
      }
      const daily = await fetchDailyPuzzle(token);
      if (seq !== requestSeqRef.current) return; // superseded
      hasDataRef.current = true;
      setDailyCard(daily.card);
      setSolvedToday(daily.solvedToday);
      setNextResetAt(daily.nextResetAt);
      setStatus('ready');
    } catch (error) {
      if (seq !== requestSeqRef.current) return; // superseded
      if (error instanceof ApiError && error.code === 'DAILY_UNAVAILABLE') {
        // Distinct no-featured-puzzle state — retrying won't change anything.
        clearDailyState();
        setStatus('unavailable');
        return;
      }
      clearDailyState();
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Please sign in again.');
      } else {
        setErrorMessage(
          formatAuthError(
            error,
            'Couldn’t load the daily challenge right now. Please try again.'
          )
        );
      }
      setStatus('error');
    }
  }, []);

  // Refetch on mount and every time the tab regains focus (same as feed).
  useFocusEffect(
    useCallback(() => {
      runFetch(hasDataRef.current ? 'quiet' : 'block');
    }, [runFetch])
  );

  const handleCardAreaLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && height !== cardAreaHeight) {
      setCardAreaHeight(height);
    }
  };

  /**
   * M7 — live solve hook from `PuzzleCard`. Context sync already happened
   * inside the card (`syncXp`), so TopBar / Stats are current; this only
   * flips the local completion flag and snapshots the authoritative streak
   * for the banner. The next focus refetch reconciles with the server.
   */
  const handleSolvedToday = useCallback((result: AnswerResult) => {
    if (!result.correct) return;
    setSolvedToday(true);
    setSolvedStreak(result.streak);
  }, []);

  // Banner streak: the live-solve snapshot when present, otherwise the
  // context streak (kept current by PuzzleCard's syncXp on every answer).
  const bannerStreak = solvedStreak ?? user?.streak ?? 0;

  const renderStageState = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.stateSubtitle}>Loading today’s puzzle…</Text>
          </View>
        );
      case 'unavailable':
        return (
          <View style={styles.stateCard}>
            <View style={styles.stateIconCircle}>
              <Ionicons name="sparkles-outline" size={26} color={Colors.neutral[500]} />
            </View>
            <Text style={styles.stateTitle}>No puzzles are available yet</Text>
            <Text style={styles.stateSubtitle}>
              PikPok is warming up. The first daily challenge will appear here soon.
            </Text>
          </View>
        );
      case 'error':
      default:
        return (
          <View style={styles.stateCard}>
            <View style={styles.stateIconCircle}>
              <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
            </View>
            <Text style={styles.stateTitle}>Couldn’t load the daily challenge</Text>
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
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppStatusBar barStyle="dark-content" />

      {/* Top Bar with the live streak pill (same as feed) */}
      <TopBar title="Daily" showStreak={true} />

      {/* Main Coral Canvas, mirroring the Feed blueprint (§3.1) */}
      <View style={styles.dailyStage}>
        {status === 'ready' && dailyCard ? (
          <View style={styles.stageInner}>
            {/* Daily Challenge indicator (translucent white pill, §3.1 badge
                tokens) + the ticking reset countdown chip. */}
            <View style={styles.indicatorRow}>
              <View style={styles.dailyPill} accessibilityLabel="Daily Challenge">
                <Ionicons name="sparkles" size={14} color={Colors.white} />
                <Text style={styles.dailyPillText}>Daily Challenge</Text>
              </View>
              <ResetCountdown nextResetAt={nextResetAt} />
            </View>

            {/* One-shot completion celebration — sits above the card, never a
                full-screen takeover. */}
            {solvedToday && <CompletedBanner streak={bannerStreak} />}

            {/* Featured card area: exactly full-height when the viewport is
                tall enough, scrollable when the banner + card outrun it. */}
            <ScrollView
              style={styles.cardScroll}
              contentContainerStyle={styles.cardScrollContent}
              onLayout={handleCardAreaLayout}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {cardAreaHeight > 0 && (
                <PuzzleCard
                  card={dailyCard}
                  cardIndex={0}
                  totalCards={1}
                  cardHeight={Math.max(cardAreaHeight, MIN_CARD_HEIGHT)}
                  isDaily={true}
                  onSolvedToday={handleSolvedToday}
                />
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.stateStage}>{renderStageState()}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  dailyStage: {
    flex: 1,
    backgroundColor: '#FF684A', // Vibrant coral background matching the Feed
  },
  stageInner: {
    flex: 1,
  },
  // M7 — "Daily Challenge" indicator: translucent white pill with bold white
  // text, exactly the §3.1 badge-row tokens. Paired with the countdown chip.
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dailyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  dailyPillText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  // Countdown chip: navy pill for a calm contrast against the coral canvas.
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.secondary[800],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  resetChipText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  // M7 — completion banner: white-on-emerald per the success palette
  // (§3.2 tertiary table), animated one-shot by CompletedBanner.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: Colors.tertiary[700],
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.tertiary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  bannerStreakPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerStreakText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  // Shared stage-state card styles (mirror feed.tsx).
  stateStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
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
});
