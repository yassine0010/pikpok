/**
 * M5 — A single puzzle card in the Feed (see docs/ui/README.md §3.1).
 *
 * Replaces the EmptyPuzzleCard placeholder with real puzzle content:
 *   - badges row (domain pill + LVL circle),
 *   - elevated translucent stage with the puzzle illustration (expo-image)
 *     on a warm-linen inset panel and the bold prompt text,
 *   - answer input stage (TextInput + navy "Go" submit),
 *   - floating Hint/Skip action rail; Hint opens a progressive hint Modal,
 *   - pagination dots + "Swipe for next" footer.
 *
 * Feedback is LOCAL to this card instance (submitting / correct / incorrect)
 * so a slow answer never blocks the vertical pager. Correctness, XP and the
 * correct answer always come from the server — the client never checks.
 * The pager scrolls on with its own gesture; nothing here intercepts it.
 *
 * M6 — every answer response (correct, incorrect and repeat solves alike)
 * echoes the authoritative XP totals, which are synced into the signed-in
 * user via `useAuth().syncXp` so TopBar / Profile / Stats update live. A first
 * XP-earning solve also pops a one-shot "+N XP" pill (built-in RN Animated,
 * skipped under Reduce Motion per docs/ui/README.md §5).
 *
 * M7 — Daily tab additions are entirely optional: `isDaily` renders a
 * "Daily" badge in the badge row and drops pager-only chrome (skip button +
 * pagination dots), and `onSolvedToday` is fired exactly once per
 * server-confirmed correct solve (repeats are gated by the local `solved`
 * state). Feed cards pass neither prop, so Feed behavior is unchanged.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  puzzleImageUrl,
  submitPuzzleAnswer,
  type PuzzleCard as PuzzleCardData,
  type PuzzleDomain,
  type AnswerResult,
} from '@/api/puzzles';
import { ApiError } from '@/api/client';
import { getAuthToken } from '@/api/tokenStorage';
import { useAuth } from '@/context/AuthContext';

interface PuzzleCardProps {
  card: PuzzleCardData;
  cardIndex: number;
  totalCards?: number;
  cardHeight: number;
  onSkipPress?: () => void;
  /** M7 — Daily tab: shows the Daily badge and hides pager-only chrome. */
  isDaily?: boolean;
  /** M7 — Daily tab: fired after a server-confirmed correct answer, exactly
   * once per solve of this card (repeat submissions are blocked by the local
   * `solved` gate). Undefined on the Feed screen. */
  onSolvedToday?: (result: AnswerResult) => void;
}

interface CardResult {
  xpAwarded?: number;
  correctAnswer?: string;
}

/** Friendly label per contract domain, shown in the badge pill. */
const DOMAIN_LABELS: Record<PuzzleDomain, string> = {
  math: 'Math',
  logic: 'Logic',
  pattern: 'Pattern',
  words: 'Words',
};

/**
 * M6 — XP-gain pill with a ONE-SHOT pop on first XP-earning display:
 * opacity 0→1 + scale 0.75→1 driven by a single gentle spring.
 *
 * A11y (docs/ui/README.md §5): no flashing, looping or repeating — one shot
 * only, and skipped entirely (instant appearance) when the OS reports Reduce
 * Motion via `AccessibilityInfo.isReduceMotionEnabled` (RN 0.88 API, verified
 * against the installed types). The animation is stopped on unmount so a
 * solved card scrolled off-screen can't schedule work afterwards.
 */
function XpGainPill({ xpAwarded }: { xpAwarded: number }) {
  // 0 → 1 one-shot progress: drives opacity and the interpolated scale.
  // Held in state (not a ref) — a stable instance created lazily outside
  // render, and readable during render to build the animated style.
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          // Skip the pop — jump straight to the resting state.
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
        // Reduce-motion state unavailable — play it safe and appear statically.
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
        styles.xpPill,
        {
          opacity: pop,
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
          ],
        },
      ]}
      accessibilityLabel={`Correct, plus ${xpAwarded} XP`}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
      <Text style={styles.xpPillText}>{`+${xpAwarded} XP`}</Text>
    </Animated.View>
  );
}

export function PuzzleCard({
  card,
  cardIndex,
  totalCards = 5,
  cardHeight,
  onSkipPress,
  isDaily,
  onSolvedToday,
}: PuzzleCardProps) {
  // Answer stage state — strictly local to this card instance.
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [solved, setSolved] = useState(false);
  const [result, setResult] = useState<CardResult>({});
  const [submitError, setSubmitError] = useState('');

  // Progressive hint sheet state.
  const [hintsOpen, setHintsOpen] = useState(false);
  const [revealedCount, setRevealedCount] = useState(1);

  const { syncXp } = useAuth();

  // Rough solve-time signal for the server (cards stay mounted while the user
  // scrolls, so this measures card visibility, which is good enough for v1).
  // Set once in a mount effect — `Date.now()` is impure and can't be called
  // during render.
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const domainLabel = DOMAIN_LABELS[card.domain] ?? 'Puzzle';
  const revealedHints = card.hints.slice(0, revealedCount);
  const hasMoreHints = revealedCount < card.hints.length;
  const goDisabled = submitting || solved || answer.trim().length === 0;

  const handleSubmit = async () => {
    if (submitting || solved) return;
    const trimmed = answer.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to submit answers.');
      }
      const answerResult = await submitPuzzleAnswer(
        token,
        card.id,
        trimmed,
        startedAtRef.current !== null
          ? Math.max(0, Date.now() - startedAtRef.current)
          : undefined
      );
      // The server echoes authoritative xpTotal/streak/level/solvedCount on
      // EVERY response — correct, incorrect and repeat solves (xpAwarded=0)
      // alike. Sync the signed-in context BEFORE showing local feedback so
      // TopBar / Profile / Stats update with the same tap.
      syncXp({
        xp: answerResult.xpTotal,
        streak: answerResult.streak,
        level: answerResult.level,
        solvedCount: answerResult.solvedCount,
      });
      // M7 — Daily tab hook: report the server-confirmed solve exactly once.
      // Subsequent submissions are blocked by the `solved` gate (checked at
      // the top of this handler), so repeat solves never re-fire this.
      if (answerResult.correct) {
        onSolvedToday?.(answerResult);
      }
      setResult(
        answerResult.correct
          ? { xpAwarded: answerResult.xpAwarded }
          : { correctAnswer: answerResult.correctAnswer }
      );
      setSolved(answerResult.correct);
    } catch (error) {
      // Not a wrong answer — a transport/server failure. Keep the input so
      // the user can simply hit Go again (the server is idempotent).
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.slideContainer, { height: cardHeight }]}>
      {/* Upper Info Badges Row */}
      <View style={styles.upperBadgesRow}>
        <View style={styles.badgesLeftGroup}>
          {/* M7 — Daily badge (same translucent-white tokens as the domain
              pill per docs/ui/README.md §3.1). */}
          {isDaily && (
            <View style={styles.domainPill} accessibilityLabel="Daily challenge">
              <Ionicons name="sparkles" size={12} color={Colors.white} />
              <Text style={styles.domainText}>Daily</Text>
            </View>
          )}
          <View style={styles.domainPill}>
            <Text style={styles.domainText}>{domainLabel}</Text>
          </View>
        </View>

        <View style={styles.levelCircle}>
          <Text style={styles.levelSub}>LVL</Text>
          <Text style={styles.levelNum}>{card.difficulty}</Text>
        </View>
      </View>

      {/* Middle Stage: Puzzle Card & Floating Action Rail */}
      <View style={styles.middleStage}>
        <View style={styles.stageCard}>
          {/* Illustration on the warm-linen inset panel */}
          <View style={styles.mediaPanel}>
            <Image
              source={{ uri: puzzleImageUrl(card) }}
              style={styles.media}
              contentFit="contain"
              transition={150}
              recyclingKey={card.id}
              accessibilityLabel={card.title || 'Puzzle illustration'}
            />
          </View>

          {/* Title caption over the prompt (optional per card) */}
          {card.title ? (
            <Text style={styles.cardTitle} numberOfLines={1}>
              {card.title}
            </Text>
          ) : null}

          {/* Structured Prompt Text (newlines preserved) — unlocks to a
              calm navy-on-linen treatment once solved */}
          <Text style={[styles.prompt, solved && styles.promptSolved]}>
            {card.prompt}
          </Text>

          {/* Feedback rows — local to this card, never blocking the pager */}
          {submitting && (
            <View style={[styles.feedbackRow, styles.feedbackNeutral]}>
              <ActivityIndicator size="small" color={Colors.secondary[800]} />
              <Text style={styles.feedbackNeutralText}>Checking your answer…</Text>
            </View>
          )}
          {solved && !submitting && (
            <>
              {result.xpAwarded !== undefined && result.xpAwarded > 0 ? (
                // New XP earned — pop the pill (static under Reduce Motion).
                <XpGainPill xpAwarded={result.xpAwarded} />
              ) : (
                // Repeat solve (no XP) — plain confirmation, no animation.
                <View style={styles.feedbackRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Colors.tertiary[700]}
                  />
                  <Text style={[styles.feedbackText, styles.feedbackCorrectText]}>
                    Solved
                  </Text>
                </View>
              )}
            </>
          )}
          {!solved && !submitting && result.correctAnswer !== undefined && (
            <View style={styles.feedbackRow}>
              <Ionicons name="close-circle" size={18} color={Colors.error} />
              <Text style={[styles.feedbackText, styles.feedbackErrorText]} numberOfLines={2}>
                {`Correct answer: ${result.correctAnswer}`}
              </Text>
            </View>
          )}
          {!solved && !submitting && submitError !== '' && (
            <View style={styles.feedbackRow}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={[styles.feedbackText, styles.feedbackErrorText]} numberOfLines={2}>
                {submitError}
              </Text>
            </View>
          )}
        </View>

        {/* Floating Action Rail on the Right Edge */}
        <View style={styles.floatingActionRail}>
          <TouchableOpacity
            style={styles.hintCircle}
            onPress={() => setHintsOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="Hint"
          >
            <Ionicons name="bulb-outline" size={22} color={Colors.white} />
          </TouchableOpacity>

          {/* M7 — Skip is pager-only chrome: meaningless on the single-card
              Daily screen, so it is omitted entirely there. */}
          {!isDaily && (
            <TouchableOpacity
              style={styles.translucentActionCircle}
              onPress={onSkipPress}
              activeOpacity={0.8}
              accessibilityLabel="Skip"
            >
              <Ionicons name="play-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Answer Input Stage */}
      <View style={styles.answerRow}>
        <View style={[styles.answerContainer, solved && styles.answerContainerSolved]}>
          <TextInput
            style={styles.answerInput}
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter your answer…"
            placeholderTextColor={Colors.neutral[500]}
            editable={!solved}
            returnKeyType="go"
            autoCorrect={false}
            onSubmitEditing={() => {
              void handleSubmit();
            }}
            accessibilityLabel={`Answer for card ${cardIndex + 1}`}
          />
          <TouchableOpacity
            style={[styles.goButton, goDisabled && styles.goButtonDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={goDisabled}
            activeOpacity={0.85}
            accessibilityLabel="Submit answer"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.goButtonText}>Go</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pagination dots & Swipe for next helper — pager-only chrome, hidden
          on the single-card Daily screen (M7). */}
      {!isDaily && (
        <View style={styles.paginationArea}>
          <View style={styles.dotsRow}>
            {Array.from({ length: totalCards }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === cardIndex ? styles.activeDot : styles.inactiveDot]}
              />
            ))}
          </View>

          <View style={styles.swipeHelperRow}>
            <Ionicons name="chevron-up" size={18} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.swipeHelperText}>Swipe for next</Text>
          </View>
        </View>
      )}

      {/* Progressive Hint Sheet */}
      <Modal
        visible={hintsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHintsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setHintsOpen(false)}
            accessibilityLabel="Close hints"
          />
          <View style={styles.hintSheet}>
            <View style={styles.hintHeader}>
              <View style={styles.hintIconCircle}>
                <Ionicons name="bulb" size={20} color={Colors.white} />
              </View>
              <View style={styles.hintHeaderText}>
                <Text style={styles.hintTitle}>Hints</Text>
                <Text style={styles.hintSubtitle}>
                  {domainLabel} · LVL {card.difficulty}
                </Text>
              </View>
            </View>

            {card.hints.length === 0 ? (
              <Text style={styles.hintEmptyText}>No hints for this puzzle.</Text>
            ) : (
              <View style={styles.hintList}>
                {revealedHints.map((hint, index) => (
                  <View key={index} style={styles.hintRow}>
                    <Text style={styles.hintLabel}>{`Hint ${index + 1}`}</Text>
                    <Text style={styles.hintBody}>{hint}</Text>
                  </View>
                ))}
              </View>
            )}

            {card.hints.length > 0 && hasMoreHints && (
              <TouchableOpacity
                style={styles.revealButton}
                onPress={() => setRevealedCount((count) => count + 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={16} color={Colors.white} />
                <Text style={styles.revealButtonText}>{`Reveal hint ${revealedCount + 1}`}</Text>
              </TouchableOpacity>
            )}
            {card.hints.length > 0 && !hasMoreHints && (
              <Text style={styles.hintEmptyText}>That’s all the hints for this puzzle.</Text>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setHintsOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  slideContainer: {
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 88, // space for bottom dock
  },
  upperBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  // M7 — left badge cluster holding the optional Daily pill before the
  // domain pill (Daily + domain pills sit side by side, LVL stays right).
  badgesLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  domainText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  levelCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelSub: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 10,
  },
  levelNum: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.white,
    lineHeight: 18,
  },
  middleStage: {
    width: '100%',
    position: 'relative',
    marginVertical: 10,
  },
  stageCard: {
    width: '88%',
    borderRadius: Spacing.borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    padding: 14,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  mediaPanel: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.canvas,
    padding: 8,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    aspectRatio: 1.4,
    maxHeight: 220,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
  },
  cardTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 12,
  },
  prompt: {
    color: Colors.white,
    fontSize: 20,
    lineHeight: 27,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  promptSolved: {
    color: Colors.secondary[800],
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
  },
  feedbackNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  feedbackNeutralText: {
    color: Colors.secondary[800],
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
  },
  feedbackText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    flexShrink: 1,
  },
  feedbackCorrectText: {
    color: Colors.tertiary[800],
  },
  feedbackErrorText: {
    color: Colors.error,
  },
  // M6 — XP-gain pill: white-on-green per the successful-feedback palette
  // (docs/ui/README.md §3.2 success feedback / tertiary table). Rounded pill,
  // bold text; animated by XpGainPill.
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 10,
    backgroundColor: Colors.tertiary[700],
    shadowColor: Colors.tertiary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  xpPillText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  floatingActionRail: {
    position: 'absolute',
    right: 0,
    top: 40,
    alignItems: 'center',
    gap: 12,
    zIndex: 20,
  },
  hintCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  translucentActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  answerRow: {
    alignSelf: 'center',
    width: '88%',
  },
  answerContainer: {
    minHeight: Spacing.component.inputHeight,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  answerContainerSolved: {
    opacity: 0.75,
  },
  answerInput: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.medium,
    paddingVertical: 0,
  },
  goButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginLeft: 10,
  },
  goButtonDisabled: {
    opacity: 0.5,
  },
  goButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  paginationArea: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: Colors.white,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  swipeHelperRow: {
    alignItems: 'center',
    gap: 2,
  },
  swipeHelperText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hintSheet: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: Spacing.borderRadius['2xl'],
    padding: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hintIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintHeaderText: {
    flexShrink: 1,
  },
  hintTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.secondary[800],
  },
  hintSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  hintList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hintRow: {
    backgroundColor: Colors.primary[50],
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  hintLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.brandBrick,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hintBody: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.secondary[800],
    lineHeight: 20,
  },
  hintEmptyText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brandPrimary,
    borderRadius: Spacing.borderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  revealButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    color: Colors.secondary[800],
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.bold,
  },
});
