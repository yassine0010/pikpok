import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';

export default function ProfileScreen() {
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (newDisplayName: string) => updateProfile(newDisplayName),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  });

  const handleSave = useCallback(() => {
    if (displayName.trim() && displayName.trim() !== user?.displayName) {
      setSaving(true);
      updateProfileMutation.mutate(displayName.trim(), {
        onSettled: () => setSaving(false)
      });
    } else {
      setEditing(false);
    }
  }, [displayName, user?.displayName, updateProfileMutation]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  }, [logout]);

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const audienceLabel = user.audienceCategory === 'CHILDREN' ? 'Children (Under 13)' : 'Teens (13-17)';
  const audienceColor = user.audienceCategory === 'CHILDREN' ? Colors.secondary : Colors.tertiary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        {editing ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.editNameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        ) : (
          <Text style={styles.displayName}>{user.displayName}</Text>
        )}
        <View style={styles.audienceBadge}>
          <View style={[styles.audienceDot, { backgroundColor: audienceColor }]} />
          <Text style={[styles.audienceText, { color: audienceColor }]}>{audienceLabel}</Text>
        </View>
        <Text style={styles.memberSince}>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={[styles.menuItem, editing && styles.menuItemDisabled]}
          onPress={() => setEditing(!editing)}
          disabled={editing}
        >
          <Ionicons name="person-outline" size={22} color={Colors.textPrimary} />
          <Text style={styles.menuItemText}>Display Name</Text>
          <Text style={styles.menuItemValue}>{editing ? 'Editing...' : user.displayName}</Text>
          {!editing && <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={[styles.menuItemText, { color: Colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.textPrimary} />
          <Text style={styles.menuItemText}>About PikPok</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={22} color={Colors.textPrimary} />
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.textPrimary} />
          <Text style={styles.menuItemText}>Safety & COPPA</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>PikPok v1.0.0 (Local)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.regular
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  avatarText: {
    fontSize: 40,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.white
  },
  editNameContainer: {
    width: '80%',
    minWidth: 200
  },
  editNameInput: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary
  },
  displayName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border
  },
  audienceDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  audienceText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold
  },
  memberSince: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  menuItemDisabled: {
    opacity: 0.6
  },
  menuItemText: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary
  },
  menuItemValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  },
  versionContainer: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: 'center'
  },
  versionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textTertiary
  }
});