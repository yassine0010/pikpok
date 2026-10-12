import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface MissingOperatorContent {
  prompt: string;
  equation: string;
  allowedSymbols: string[];
  inputPlaceholder: string;
}

interface MissingOperatorRendererProps {
  content: MissingOperatorContent;
}

export function MissingOperatorRenderer({ content }: MissingOperatorRendererProps) {
  // Parse the equation to highlight missing parts
  const parts = content.equation.split(/(\s+)/);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{content.prompt}</Text>
      <View style={styles.equationContainer}>
        <Text style={styles.equation} children={parts.map((part, i) => {
          if (part.trim() === '' || part === ' ') return <Text key={i} style={styles.equationPart}>{part}</Text>;
          const isMissing = content.allowedSymbols.some(s => part.includes(s)) && part.includes('?');
          return (
            <Text key={i} style={[styles.equationPart, isMissing && styles.missingPart]}>
              {part.replace('?', '_')}
            </Text>
          );
        })} />
      </View>
      <View style={styles.allowedSymbols}>
        <Text style={styles.allowedLabel}>Allowed: </Text>
        {content.allowedSymbols.map((symbol, i) => (
          <View key={i} style={styles.symbolChip}>
            <Text style={styles.symbolText}>{symbol}</Text>
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
  equationContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },
  equation: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.lg,
    letterSpacing: 0.5
  },
  equationPart: {},
  missingPart: {
    color: Colors.primary,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    borderRadius: 4
  },
  allowedSymbols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs
  },
  allowedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginRight: Spacing.xs
  },
  symbolChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30'
  },
  symbolText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary
  }
});