import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';

interface EmptyPuzzleCardProps {
  cardIndex: number;
  totalCards?: number;
  level?: number;
  cardHeight: number;
  onHintPress?: () => void;
  onSkipPress?: () => void;
  onSharePress?: () => void;
}

export function EmptyPuzzleCard({
  cardIndex,
  totalCards = 5,
  level = 1,
  cardHeight,
  onHintPress,
  onSkipPress,
  onSharePress,
}: EmptyPuzzleCardProps) {
  return (
    <View style={[styles.slideContainer, { height: cardHeight }]}>
      {/* Upper Info Badges Row */}
      <View style={styles.upperBadgesRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>Card #{cardIndex + 1}</Text>
        </View>

        <View style={styles.levelCircle}>
          <Text style={styles.levelSub}>LVL</Text>
          <Text style={styles.levelNum}>{level}</Text>
        </View>
      </View>

      {/* Middle Stage: Empty Card & Floating Action Rail */}
      <View style={styles.middleStage}>
        {/* Main Puzzle Card Container - Clean and Empty per requirement */}
        <View style={styles.emptyCardBox}>
          {/* Subtle dotted outline indicating future content stage */}
          <View style={styles.emptyStageFrame}>
            <View style={styles.emptyCardHeader}>
              <View style={styles.emptyPulseDot} />
              <Text style={styles.emptyCardLabel}>Puzzle Card Stage</Text>
            </View>
            <View style={styles.placeholderDashes} />
          </View>
        </View>

        {/* Floating Action Rail on the Right Edge (matching fedd ui.jpeg) */}
        <View style={styles.floatingActionRail}>
          {/* Hint Button (Solid dark navy circle with lightbulb) */}
          <TouchableOpacity
            style={styles.hintCircle}
            onPress={onHintPress}
            activeOpacity={0.8}
            accessibilityLabel="Hint"
          >
            <Ionicons name="bulb-outline" size={22} color={Colors.white} />
          </TouchableOpacity>

          {/* Skip Button (Translucent circle with fast-forward) */}
          <TouchableOpacity
            style={styles.translucentActionCircle}
            onPress={onSkipPress}
            activeOpacity={0.8}
            accessibilityLabel="Skip"
          >
            <Ionicons name="play-forward" size={18} color={Colors.secondary[800]} />
          </TouchableOpacity>

          {/* Share Button (Translucent circle with share icon) */}
          <TouchableOpacity
            style={styles.translucentActionCircle}
            onPress={onSharePress}
            activeOpacity={0.8}
            accessibilityLabel="Share"
          >
            <Ionicons name="share-social-outline" size={18} color={Colors.secondary[800]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty Answer Stage (matching the pill slots in fedd ui.jpeg) */}
      <View style={styles.answerSlotsContainer}>
        {/* Slot 1: Inverted Navy Pill */}
        <View style={styles.answerSlotNavy}>
          <View style={styles.emptySlotIndicator} />
        </View>

        {/* Slot 2: Translucent Coral Pill */}
        <View style={styles.answerSlotCoral}>
          <View style={[styles.emptySlotIndicator, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />
        </View>
      </View>

      {/* Pagination dots & Swipe for next helper */}
      <View style={styles.paginationArea}>
        <View style={styles.dotsRow}>
          {Array.from({ length: totalCards }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === cardIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.swipeHelperRow}>
          <Ionicons name="chevron-up" size={18} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.swipeHelperText}>Swipe for next</Text>
        </View>
      </View>
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
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  levelCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelSub: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: Typography.fontFamily.bold,
    lineHeight: 10,
  },
  levelNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: Typography.fontFamily.bold,
    lineHeight: 18,
  },
  middleStage: {
    width: '100%',
    position: 'relative',
    marginVertical: 10,
  },
  emptyCardBox: {
    width: '88%',
    height: 190,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  emptyStageFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  emptyCardLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.3,
  },
  placeholderDashes: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
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
    backgroundColor: 'rgba(26, 31, 54, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  answerSlotsContainer: {
    width: '88%',
    gap: 12,
  },
  answerSlotNavy: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  answerSlotCoral: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semiBold,
  },
});
