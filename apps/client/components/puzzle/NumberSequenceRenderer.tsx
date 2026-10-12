import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface NumberSequenceContent {
  prompt: string;
  sequence: (number | null)[];
  displayFormat: string;
  inputPlaceholder: string;
}

interface NumberSequenceRendererProps {
  content: NumberSequenceContent;
}

export function NumberSequenceRenderer({ content }: NumberSequenceRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{content.prompt}</Text>
      <View style={styles.sequenceContainer}>
        {content.sequence.map((num, index) => (
          <View key={index} style={styles.sequenceItem}>
            {num === null ? (
              <View style={styles.missingBox}>
                <Text style={styles.missingText}>&nbsp;</Text>
              </View>
            ) : (
              <Text style={styles.sequenceNumber}>{num}</Text>
            )}
            {index < content.sequence.length - 1 && <Text style={styles.separator}>{content.displayFormat}</Text>}
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
  sequenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm
  },
  sequenceItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sequenceNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    minWidth: 40,
    textAlign: 'center'
  },
  missingBox: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '05'
  },
  missingText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary
  },
  separator: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.xs
  }
});