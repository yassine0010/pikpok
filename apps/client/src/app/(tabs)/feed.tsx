import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { PuzzleCard } from '@/components/PuzzleCard';
import { ApiError, formatAuthError } from '@/api/client';
import { fetchPuzzleFeed, type PuzzleCard as PuzzleCardData } from '@/api/puzzles';
import { getAuthToken } from '@/api/tokenStorage';

/** Matches the puzzle feed contract's default page size (1..50). */
const FEED_LIMIT = 20;

type FeedStatus = 'loading' | 'empty' | 'error' | 'ready';

const PagingList = FlatList as any;
const AppStatusBar = StatusBar as any;

export default function FeedScreen() {
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<any>(null);

  // Cards come from the main API (see src/api/puzzles.ts) — the feed never
  // fabricates puzzle content. The API base URL is always configured, so the
  // only pre-flight condition is having a stored session token.
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [cards, setCards] = useState<PuzzleCardData[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Guards against out-of-order responses when focus events stack up.
  const requestSeqRef = useRef(0);
  // Mirrors whether `cards` holds a successful load, so focus refetches can
  // refresh quietly instead of blanking the screen with a spinner.
  const hasDataRef = useRef(false);

  /**
   * Loads the puzzle feed through the M5 API module.
   * - 'block':  show the loading state (first load and retry)
   * - 'quiet':  keep current cards on screen (silent background refresh)
   */
  const runFetch = useCallback(async (presentation: 'block' | 'quiet') => {
    if (presentation === 'block') setStatus('loading');

    const seq = ++requestSeqRef.current;
    try {
      const token = await getAuthToken();
      if (seq !== requestSeqRef.current) return; // superseded
      if (!token) {
        // Auth gating upstream should guarantee a token; a missing/expired
        // one is just surfaced as the regular error state with friendly copy.
        hasDataRef.current = false;
        setCards([]);
        setErrorMessage('Please sign in to see puzzles.');
        setStatus('error');
        return;
      }
      const feed = await fetchPuzzleFeed(token, { limit: FEED_LIMIT });
      if (seq !== requestSeqRef.current) return; // superseded
      hasDataRef.current = true;
      setCards(feed.cards);
      setErrorMessage('');
      setStatus(feed.cards.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      if (seq !== requestSeqRef.current) return; // superseded
      hasDataRef.current = false;
      setCards([]);
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage('Your session has expired. Please sign in again.');
      } else {
        setErrorMessage(
          formatAuthError(
            error,
            'Couldn’t load puzzles right now. Please try again.'
          )
        );
      }
      setStatus('error');
    }
  }, []);

  // Refetch on mount and every time the tab regains focus (same as leaderboard).
  useFocusEffect(
    useCallback(() => {
      runFetch(hasDataRef.current ? 'quiet' : 'block');
    }, [runFetch])
  );

  const onLayoutContainer = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && height !== containerHeight) {
      setContainerHeight(height);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerHeight > 0) {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / containerHeight);
      if (index >= 0 && index < cards.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  const handleSkip = (currentIndex: number) => {
    if (currentIndex < cards.length - 1 && flatListRef.current && containerHeight > 0) {
      flatListRef.current.scrollToOffset({
        offset: (currentIndex + 1) * containerHeight,
        animated: true,
      });
    }
  };

  const renderStageState = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.stateSubtitle}>Loading puzzles…</Text>
          </View>
        );
      case 'empty':
        return (
          <View style={styles.stateCard}>
            <View style={styles.stateIconCircle}>
              <Ionicons name="albums-outline" size={26} color={Colors.neutral[500]} />
            </View>
            <Text style={styles.stateTitle}>No puzzles right now</Text>
            <Text style={styles.stateSubtitle}>
              There’s nothing to solve at the moment. New puzzles will appear here soon.
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
            <Text style={styles.stateTitle}>Couldn’t load puzzles</Text>
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

      {/* Top Bar matching fedd ui.jpeg */}
      <TopBar title="PikPok" showStreak={true} />

      {/* Main Coral Canvas with Instagram Reels / TikTok vertical paging mechanism */}
      <View style={styles.reelStage} onLayout={onLayoutContainer}>
        {status === 'ready' ? (
          containerHeight > 0 && (
            <PagingList
              ref={flatListRef}
              data={cards}
              keyExtractor={(item: PuzzleCardData, index: number) =>
                String(item.id || `card_${index}`)
              }
              pagingEnabled={true}
              snapToInterval={containerHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              getItemLayout={(_: any, index: number) => ({
                length: containerHeight,
                offset: containerHeight * index,
                index,
              })}
              renderItem={({
                item,
                index,
              }: {
                item: PuzzleCardData;
                index: number;
              }) => (
                <PuzzleCard
                  card={item}
                  cardIndex={index}
                  totalCards={cards.length}
                  cardHeight={containerHeight}
                  onSkipPress={() => handleSkip(index)}
                />
              )}
            />
          )
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
  reelStage: {
    flex: 1,
    backgroundColor: '#FF684A', // Vibrant coral background matching fedd ui.jpeg
  },
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
