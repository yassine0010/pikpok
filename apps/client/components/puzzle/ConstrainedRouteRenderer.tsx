import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface RouteGrid {
  rows: number;
  cols: number;
  cells: string[][];
}

interface ConstrainedRouteContent {
  prompt: string;
  grid: RouteGrid;
  legend: Record<string, string>;
  inputPlaceholder: string;
}

interface ConstrainedRouteRendererProps {
  content: ConstrainedRouteContent;
}

const CELL_SIZE = 36;
const CELL_GAP = 2;

const CELL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  S: { bg: Colors.success + '20', border: Colors.success, text: Colors.success },
  E: { bg: Colors.error + '20', border: Colors.error, text: Colors.error },
  '.': { bg: Colors.background, border: Colors.border, text: Colors.textPrimary },
  '#': { bg: Colors.textTertiary + '20', border: Colors.textTertiary, text: Colors.textTertiary }
};

export function ConstrainedRouteRenderer({ content }: ConstrainedRouteRendererProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{content.prompt}</Text>

      <View style={styles.gridContainer}>
        {content.grid.cells.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((cell, c) => {
              const colors = CELL_COLORS[cell] ?? { bg: Colors.background, border: Colors.border, text: Colors.textPrimary };
              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      width: CELL_SIZE,
                      height: CELL_SIZE
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: colors.text }
                    ]}
                  >
                    {cell === '.' ? '' : cell === '#' ? '■' : cell}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          {Object.entries(content.legend).map(([symbol, meaning]) => (
            <View key={symbol} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSymbol,
                  { backgroundColor: CELL_COLORS[symbol]?.bg || Colors.background, borderColor: CELL_COLORS[symbol]?.border || Colors.border }
                ]}
              >
                <Text style={{ color: CELL_COLORS[symbol]?.text || Colors.textPrimary }}>
                  {symbol === '.' ? '' : symbol === '#' ? '■' : symbol}
                </Text>
              </View>
              <Text style={styles.legendText}>{meaning}</Text>
            </View>
          ))}
        </View>
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
  gridContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border
  },
  gridRow: {
    flexDirection: 'row'
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: CELL_GAP / 2
  },
  cellText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold
  },
  legendContainer: {
    gap: Spacing.xs
  },
  legendTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  legendSymbol: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  legendText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  }
});