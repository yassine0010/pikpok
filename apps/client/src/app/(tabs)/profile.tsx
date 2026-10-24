import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/context/AuthContext';
import { formatAuthError } from '@/api/client';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? '');

  const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
  const age = user?.age;
  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const level = user?.level ?? 0;

  const handleSaveName = async () => {
    const nextName = nameInput.trim();
    if (!user || savingName) {
      setEditing(false);
      return;
    }
    if (!nextName || nextName === user.displayName) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ displayName: nextName });
      setEditing(false);
    } catch (error) {
      Alert.alert('Could not save', formatAuthError(error, 'Please try again.'));
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    if (!user) {
      // Guest browsing the skeleton — just go back to the login screen.
      router.replace('/auth/login');
      return;
    }
    await logout();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TopBar title="Profile" showStreak={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                editable={!savingName}
              />
              <TouchableOpacity
                style={[styles.saveButton, savingName && styles.saveButtonDisabled]}
                onPress={handleSaveName}
                disabled={savingName}
              >
                <Ionicons name="checkmark" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{user?.displayName ?? 'Guest'}</Text>
              {user && (
                <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.neutral[500]} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.userEmail}>{user?.email ?? 'Not signed in'}</Text>

          {/* Age and Member Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary[600]} />
              <Text style={styles.badgeText}>{age != null ? `Age: ${age}` : 'Age: —'}</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.tertiary[600]} />
              <Text style={styles.badgeText}>Verified Solver</Text>
            </View>
          </View>
        </View>

        {/* Cognitive & Game Stats Strip */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary[600] }]}>{streak} 🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.tertiary[600] }]}>LVL {level}</Text>
            <Text style={styles.statLabel}>Cognitive</Text>
          </View>
        </View>

        {/* Account Details Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeading}>Account Details</Text>

          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuIconBox}>
                <Ionicons name="person-outline" size={20} color={Colors.secondary[800]} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Display Name</Text>
                <Text style={styles.menuValue}>{user?.displayName ?? 'Guest'}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItem}>
              <View style={styles.menuIconBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.secondary[800]} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Email Address</Text>
                <Text style={styles.menuValue}>{user?.email ?? 'Not signed in'}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItem}>
              <View style={styles.menuIconBox}>
                <Ionicons name="time-outline" size={20} color={Colors.secondary[800]} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Age</Text>
                <Text style={styles.menuValue}>
                  {age != null ? `${age} years old` : 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeading}>Session & Navigation</Text>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(tabs)/feed')}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles-outline" size={20} color={Colors.primary[500]} />
              <Text style={styles.actionText}>Jump to Puzzle Stream</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(tabs)/stats')}
              activeOpacity={0.7}
            >
              <Ionicons name="bar-chart-outline" size={20} color={Colors.tertiary[600]} />
              <Text style={styles.actionText}>View Cognitive Growth Chart</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons
                name={user ? 'log-out-outline' : 'log-in-outline'}
                size={20}
                color={Colors.error}
              />
              <Text style={[styles.actionText, { color: Colors.error }]}>
                {user ? 'Sign Out' : 'Sign In'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.neutral[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version Info */}
        <View style={styles.appFooter}>
          <Text style={styles.versionTitle}>PikPok Mobile v1.0.0</Text>
          <Text style={styles.versionSub}>PikPok — Smart Daily Micro-Puzzles</Text>
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
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.secondary[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Typography.fontFamily.bold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary[500],
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 160,
    textAlign: 'center',
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: 6,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.semiBold,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.bold,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.medium,
  },
  menuSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral[150],
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.medium,
  },
  menuValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.semiBold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.neutral[150],
    marginLeft: 58,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.secondary[800],
    fontFamily: Typography.fontFamily.semiBold,
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: 2,
  },
  versionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.neutral[600],
    fontFamily: Typography.fontFamily.semiBold,
  },
  versionSub: {
    fontSize: 10,
    color: Colors.neutral[500],
    fontFamily: Typography.fontFamily.regular,
  },
});
