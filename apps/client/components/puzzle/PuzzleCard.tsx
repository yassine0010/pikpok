import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import type { FeedPuzzle } from '@/services/api';
import { NumberSequenceRenderer } from './NumberSequenceRenderer';
import { MissingOperatorRenderer } from './MissingOperatorRenderer';
import { SchedulingOrderRenderer } from './SchedulingOrderRenderer';
import { OneTrueStatementRenderer } from './OneTrueStatementRenderer';
import { ConstrainedRouteRenderer } from './ConstrainedRouteRenderer';
import { HintPanel } from '@/components/hints/HintPanel';
import { AnswerInput } from '@/components/puzzle/AnswerInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';

interface PuzzleCardProps {
  puzzle: FeedPuzzle;
  index: number;
  onSkip: (interactionId: string, puzzleId: string, contentVersion: number) => void;
}

export function PuzzleCard({ puzzle, index, onSkip }: PuzzleCardProps) {
  const [showHints, setShowHints] = useState(false);
  const [hintTier, setHintTier] = useState<1 | 2 | 3>(1);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [interactionId] = useState(() => uuidv4());
  const { isAuthenticated } = useAuth();

  const renderPuzzleContent = () => {
    switch (puzzle.type) {
      case 'NUMBER_SEQUENCE':
        return <NumberSequenceRenderer content={puzzle.content as any} />;
      case 'MISSING_OPERATOR':
        return <MissingOperatorRenderer content={puzzle.content as any} />;
      case 'SCHEDULING_ORDER':
        return <SchedulingOrderRenderer content={puzzle.content as any} />;
      case 'ONE_TRUE_STATEMENT':
        return <OneTrueStatementRenderer content={puzzle.content as any} />;
      case 'CONSTRAINED_ROUTE':
        return <ConstrainedRouteRenderer content={puzzle.content as any} />;
      default:
        return (
          <View style={styles.unsupportedType}>
            <Text style={styles.unsupportedText}>Unsupported puzzle type: {puzzle.type}</Text>
          </View>
        );
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting || !isAuthenticated) return;

    setSubmitting(true);
    // In a real app, this would call the answer API
    // For now, we'll simulate a response
    setTimeout(() => {
      const isCorrect = Math.random() > 0.5;
      setResult(isCorrect ? 'correct' : 'incorrect');
      setSubmitting(false);

      // Reset after animation
      setTimeout(() => {
        setResult(null);
        setAnswer('');
      }, 2000);
    }, 1000);
  };

  const handleSkip = () => {
    onSkip(interactionId, puzzle.id, puzzle.contentVersion);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{puzzle.type.replace('_', ' ')}</Text>
        </View>
        <View style={styles.domainBadge}>
          <Text style={styles.domainText}>{puzzle.domain}</Text>
        </View>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={submitting || !!result}>
          <Ionicons name="play-skip-forward-outline" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderPuzzleContent()}
      </View>

      <HintPanel
        puzzle={puzzle}
        visible={showHints}
        currentTier={hintTier}
        onClose={() => setShowHints(false)}
        onNextTier={() => setHintTier((t) => (t < 3 ? (t + 1) as 1 | 2 | 3 : 3))}
        onPrevTier={() => setHintTier((t) => (t > 1 ? (t - 1) as 1 | 2 | 3 : 1))}
      />

      <AnswerInput
        value={answer}
        onChangeText={setAnswer}
        onSubmit={handleSubmit}
        disabled={submitting || !!result}
        placeholder="Type your answer..."
        result={result}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.hintButton, showHints && styles.hintButtonActive]}
          onPress={() => setShowHints(!showHints)}
          disabled={submitting || !!result}
        >
          <Ionicons name={showHints ? 'bulb' : 'bulb-outline'} size={20} color={showHints ? Colors.warning : Colors.textSecondary} />
          <Text style={styles.hintButtonText}>Hints ({puzzle.staticHints.length})</Text>
        </TouchableOpacity>

        <View style={styles.difficulty}>
          <Text style={styles.difficultyLabel}>Difficulty: </Text>
          <Text style={styles.difficultyValue}>{puzzle.difficultyRating}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md
  },
  typeBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8
  },
  typeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    textTransform: 'capitalize'
  },
  domainBadge: {
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8
  },
  domainText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.secondary,
    textTransform: 'capitalize'
  },
  skipButton: {
    padding: Spacing.xs
  },
  content: {
    marginBottom: Spacing.md
  },
  unsupportedType: {
    padding: Spacing.xl,
    alignItems: 'center'
  },
  unsupportedText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.regular
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: 8
  },
  hintButtonActive: {
    backgroundColor: Colors.warning + '15'
  },
  hintButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary
  },
  difficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  difficultyLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  },
  difficultyValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary
  }
});