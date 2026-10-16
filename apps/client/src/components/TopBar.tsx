import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

interface TopBarProps {
  title?: string;
  showStreak?: boolean;
}

export function TopBar({ title = 'PikPok', showStreak = true }: TopBarProps) {
  const { user } = useAuth();
  const router = useRouter();

  const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
  const streak = user?.streak ?? 12;

  return (
    <View style={styles.container}>
      {/* User Avatar Circle */}
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => router.push('/(tabs)/profile')}
        activeOpacity={0.8}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </TouchableOpacity>

      {/* Brand Title */}
      <View style={styles.brandContainer}>
        <Text style={styles.brandTitle}>{title}</Text>
      </View>

      {/* Streak Pill */}
      {showStreak ? (
        <TouchableOpacity
          style={styles.streakPill}
          onPress={() => router.push('/(tabs)/stats')}
          activeOpacity={0.8}
        >
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakCount}>{streak}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.avatarButtonPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4EFEA',
    borderWidth: 1.5,
    borderColor: '#E8DFD7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  avatarText: {
    color: '#A82E18',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.fontFamily.bold,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#A82E18',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DFD7',
    gap: 4,
  },
  streakFlame: {
    fontSize: 13,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1F36',
    fontFamily: Typography.fontFamily.bold,
  },
});
