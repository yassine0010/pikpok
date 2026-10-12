import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { FeedPuzzle } from '@/services/api';
import type { StaticHint } from '@common/types/puzzle.types';

interface HintPanelProps {
  puzzle: FeedPuzzle;
  visible: boolean;
  currentTier: 1 | 2 | 3;
  onClose: () => void;
  onNextTier: () => void;
  onPrevTier: () => void;
}

export function HintPanel({ puzzle, visible, currentTier, onClose, onNextTier, onPrevTier }: HintPanelProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: false })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        Animated.timing(slideAnim, { toValue: 20, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: false })
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const availableHints = puzzle.staticHints.filter(h => h.tier <= currentTier);
  const currentHint = puzzle.staticHints.find(h => h.tier === currentTier);

  const tierColors: Record<number, string> = {
    1: Colors.info,
    2: Colors.warning,
    3: Colors.tertiary
  };

  const tierLabels: Record<number, string> = {
    1: 'Guiding Question',
    2: 'Strategic Clue',
    3: 'Step Walkthrough'
  };

  const tierIcons: Record<number, React.ComponentProps<typeof Ionicons>['name']> = {
    1: 'help-circle-outline',
    2: 'bulb-outline',
    3: 'list-outline'
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.tierIndicator}>
          {puzzle.staticHints.map((hint, index) => (
            <TouchableOpacity
              key={hint.tier}
              style={[
                styles.tierDot,
                hint.tier <= currentTier && styles.tierDotActive,
                { backgroundColor: hint.tier <= currentTier ? tierColors[hint.tier] : Colors.border }
              ]}
              onPress={() => {
                if (hint.tier <= currentTier) {
                  // Could add tier switching logic here
                }
              }}
              disabled={hint.tier > currentTier}
            />
          ))}
        </View>

        <View style={styles.tierInfo}>
          <View style={styles.tierBadge}>
            <Ionicons name={tierIcons[currentTier]} size={16} color={Colors.white} />
            <Text style={styles.tierBadgeText}>{tierLabels[currentTier]}</Text>
          </View>
          <Text style={[styles.tierDescription, { color: tierColors[currentTier] }]}>
            Tier {currentTier} of {puzzle.staticHints.length}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {availableHints.map((hint) => (
          <View key={hint.tier} style={[styles.hintCard, hint.tier === currentTier && styles.hintCardActive]}>
            <View style={styles.hintHeader}>
              <View style={[styles.hintTierBadge, { backgroundColor: tierColors[hint.tier] }]}>
                <Text style={styles.hintTierText}>{hint.tier}</Text>
              </View>
              <Text style={styles.hintType}>{hint.type.replace('_', ' ')}</Text>
            </View>
            <Text style={[styles.hintContent, hint.tier === currentTier && styles.hintContentActive]}>
              {hint.content}
            </Text>
          </View>
        ))}

        {currentTier < 3 && currentHint && (
          <TouchableOpacity style={styles.nextButton} onPress={onNextTier} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>Reveal Next Hint</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}

        {currentTier === 3 && currentHint && (
          <View style={styles.finalHint}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.finalHintText}>This is the final hint tier</Text>
          </View>
        )}
      </View>

      <View style={styles.navigation}>
        {currentTier > 1 && (
          <TouchableOpacity style={styles.prevButton} onPress={onPrevTier} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        <View style={styles.navSpacer} />
      </View>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md
  },
  tierIndicator: {
    flexDirection: 'row',
    gap: Spacing.xs
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border
  },
  tierDotActive: {
    borderWidth: 0
  },
  tierInfo: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 20
  },
  tierBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white
  },
  tierDescription: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium
  },
  closeButton: {
    padding: Spacing.xs
  },
  content: {
    gap: Spacing.md
  },
  hintCard: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs
  },
  hintCardActive: {
    borderColor: Colors.primary,
    borderWidth: 2
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  hintTierBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  hintTierText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.white
  },
  hintType: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    textTransform: 'capitalize'
  },
  hintContent: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.md,
    marginLeft: Spacing.md + 24
  },
  hintContentActive: {
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginTop: Spacing.sm
  },
  nextButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white
  },
  finalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm
  },
  finalHintText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.success
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8
  },
  prevButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary
  },
  navSpacer: {
    width: 80
  }
});