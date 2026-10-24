import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const SvgCurve = Svg as any;
const SvgPath = Path as any;
const SvgCircle = Circle as any;
const SvgDefs = Defs as any;
const SvgLinearGradient = LinearGradient as any;
const SvgStop = Stop as any;

export default function StatsScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 64, 340);

  // M6 — the three Quick Stat cards are live from the signed-in user context
  // (synced after every answer, see PuzzleCard). Everything below them stays
  // an illustrative placeholder until a history API exists.
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TopBar title="PikPok" showStreak={true} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section (Matching stats.jpeg) */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>Your Growth</Text>
          <Text style={styles.sectionSub}>Keep pushing your cognitive boundaries.</Text>
        </View>

        {/* Quick Metric 3-Card Row (Matching stats.jpeg) */}
        <View style={styles.metricsRow}>
          {/* Card 1: Solved */}
          <View style={styles.metricCardWhite}>
            <Text style={styles.solvedValue}>{user?.solvedCount ?? 0}</Text>
            <Text style={styles.metricLabel}>SOLVED</Text>
          </View>

          {/* Card 2: Streak (Solid Coral with navy icon + text) */}
          <View style={styles.metricCardCoral}>
            <View style={styles.streakValRow}>
              <Ionicons name="stats-chart" size={16} color="#1A1F36" />
              <Text style={styles.streakValue}>{user?.streak ?? 0}</Text>
            </View>
            <Text style={styles.streakLabel}>STREAK</Text>
          </View>

          {/* Card 3: Badge */}
          <View style={styles.metricCardWhite}>
            <Text style={styles.badgeValue}>{`LVL ${user?.level ?? 1}`}</Text>
            <Text style={styles.metricLabel}>BADGE</Text>
          </View>
        </View>

        {/* Weekly Trend Card with Smooth Curve Chart (Matching stats.jpeg).
            Illustrative placeholder — no history API yet (M6), so the curve,
            dots and legend are static sample data, not live metrics. */}
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTitle}>Weekly Trend</Text>
            <TouchableOpacity hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {/* Smooth SVG Trend Curve */}
          <View style={styles.chartSvgContainer}>
            <SvgCurve width={chartWidth} height={130} viewBox="0 0 320 120">
              <SvgDefs>
                <SvgLinearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <SvgStop offset="0%" stopColor="#FF6B4A" stopOpacity="0.25" />
                  <SvgStop offset="100%" stopColor="#FFFBF5" stopOpacity="0.0" />
                </SvgLinearGradient>
              </SvgDefs>

              {/* Shaded Area Under Curve */}
              <SvgPath
                d="M 10 90 C 45 88, 70 94, 95 86 C 120 78, 155 35, 185 38 C 215 42, 235 84, 255 78 C 280 72, 295 35, 310 18 L 310 115 L 10 115 Z"
                fill="url(#curveGradient)"
              />

              {/* Curve Stroke Line */}
              <SvgPath
                d="M 10 90 C 45 88, 70 94, 95 86 C 120 78, 155 35, 185 38 C 215 42, 235 84, 255 78 C 280 72, 295 35, 310 18"
                fill="none"
                stroke="#A82E18"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Dot 1: Math (Coral) on Tuesday */}
              <SvgCircle cx="95" cy="86" r="4.5" fill="#FF6B4A" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Dot 2: Logic (Navy) on Thursday */}
              <SvgCircle cx="185" cy="38" r="4.5" fill="#1A1F36" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Dot 3: Patterns (Emerald Green) on Saturday */}
              <SvgCircle cx="255" cy="78" r="4.5" fill="#4CAF50" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Dot 4: Words (Brick Red) on Sunday */}
              <SvgCircle cx="310" cy="18" r="4.5" fill="#A82E18" stroke="#FFFFFF" strokeWidth="1.5" />
            </SvgCurve>
          </View>

          {/* Days Row */}
          <View style={styles.daysRow}>
            <Text style={styles.dayText}>MON</Text>
            <Text style={styles.dayText}>TUE</Text>
            <Text style={styles.dayText}>WED</Text>
            <Text style={styles.dayText}>THU</Text>
            <Text style={styles.dayText}>FRI</Text>
            <Text style={styles.dayText}>SAT</Text>
            <Text style={[styles.dayText, styles.dayTextActive]}>SUN</Text>
          </View>

          {/* Legend Row matching stats.jpeg */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B4A' }]} />
              <Text style={styles.legendText}>Math</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1A1F36' }]} />
              <Text style={styles.legendText}>Logic</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Patterns</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A82E18' }]} />
              <Text style={styles.legendText}>Words</Text>
            </View>
          </View>
        </View>

        {/* Insight Highlight Card (Soft lavender surface matching stats.jpeg) */}
        <View style={styles.insightCard}>
          <View style={styles.insightIconCircle}>
            <Ionicons name="trending-up" size={20} color="#566290" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>
              Your pattern recognition is up 24% this month
            </Text>
            <Text style={styles.insightDescription}>
              You’re processing logic puzzles 1.2s faster than your average.
            </Text>
          </View>
        </View>

        {/* Domain Skill Cards Grid matching stats.jpeg */}
        <View style={styles.skillsGrid}>
          {/* Memory Card (Warm Cream / Rust) */}
          <View style={[styles.skillCard, { backgroundColor: '#F4EFEA' }]}>
            <View style={styles.skillIconCircle}>
              <Ionicons name="extension-puzzle-outline" size={20} color="#A82E18" />
            </View>
            <Text style={styles.skillTitle}>Memory</Text>
          </View>

          {/* Reaction Card (Sage Green) */}
          <View style={[styles.skillCard, { backgroundColor: '#E3EEDC' }]}>
            <View style={styles.skillIconCircle}>
              <Ionicons name="speedometer-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.skillTitle}>Reaction</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 96,
  },
  titleSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9DA7D0',
    fontFamily: Typography.fontFamily.bold,
  },
  sectionSub: {
    fontSize: 14,
    color: '#3C312E',
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  metricCardWhite: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DFD7',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  solvedValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A82E18',
    fontFamily: Typography.fontFamily.bold,
  },
  badgeValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4CAF50',
    fontFamily: Typography.fontFamily.bold,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  metricCardCoral: {
    flex: 1,
    backgroundColor: '#FF684A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#FF684A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  streakValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DFD7',
    padding: 18,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
  },
  chartSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#766B67',
    fontFamily: Typography.fontFamily.semiBold,
  },
  dayTextActive: {
    color: '#A82E18',
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F4EFEA',
    paddingTop: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 12,
    color: '#1A1F36',
    fontWeight: '500',
    fontFamily: Typography.fontFamily.medium,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#E3E2FF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  insightIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
    lineHeight: 18,
  },
  insightDescription: {
    fontSize: 12,
    color: '#566290',
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 16,
  },
  skillsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
  },
  skillCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    height: 100,
    justifyContent: 'space-between',
  },
  skillIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
  },
});
