import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface StatementItem {
  label: string;
  text: string;
}

interface OneTrueStatementContent {
  scenario: string;
  statements: StatementItem[];
  question: string;
  inputPlaceholder: string;
}

interface OneTrueStatementRendererProps {
  content: OneTrueStatementContent;
}

export function OneTrueStatementRenderer({ content }: OneTrueStatementRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.scenario}>{content.scenario}</Text>

      <View style={styles.statementsContainer}>
        {content.statements.map((statement, index) => (
          <View key={statement.label} style={styles.statementCard}>
            <View style={styles.statementHeader}>
              <View style={styles.statementLabel}>
                <Text style={styles.statementLetter}>{statement.label}</Text>
              </View>
            </View>
            <Text style={styles.statementText}>{statement.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.question}>{content.question}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md
  },
  scenario: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.md,
    fontStyle: 'italic'
  },
  statementsContainer: {
    gap: Spacing.sm
  },
  statementCard: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statementLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statementLetter: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary
  },
  statementText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.md,
    marginLeft: Spacing.md
  },
  questionContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '30'
  },
  question: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.warning,
    textAlign: 'center'
  }
});