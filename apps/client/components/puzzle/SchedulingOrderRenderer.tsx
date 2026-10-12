import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface SchedulingItem {
  id: string;
  label: string;
}

interface SchedulingOrderContent {
  prompt: string;
  items: SchedulingItem[];
  clues: string[];
  inputPlaceholder: string;
}

interface SchedulingOrderRendererProps {
  content: SchedulingOrderContent;
}

export function SchedulingOrderRenderer({ content }: SchedulingOrderRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{content.prompt}</Text>

      <View style={styles.itemsContainer}>
        {content.items.map((item, index) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemNumber}>{index + 1}.</View>
            <View style={styles.itemCard}>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.cluesContainer}>
        <Text style={styles.cluesTitle}>Clues:</Text>
        {content.clues.map((clue, index) => (
          <View key={index} style={styles.clueRow}>
            <View style={styles.clueBullet} />
            <Text style={styles.clueText}>{clue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md
  },
  prompt: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.md
  },
  itemsContainer: {
    gap: Spacing.sm
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md
  },
  itemNumber: {
    width: 24,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    textAlign: 'right'
  },
  itemCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border
  },
  itemLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary
  },
  cluesContainer: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm
  },
  cluesTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm
  },
  clueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6
  },
  clueText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.md
  }
});