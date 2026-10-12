import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Picker } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';

type AudienceCategory = 'CHILDREN' | 'TEENS';

const AUDIENCE_OPTIONS: { label: string; value: AudienceCategory; description: string; color: string }[] = [
  {
    label: 'Children (Under 13)',
    value: 'CHILDREN',
    description: 'Colorful, reward-driven puzzles with simpler reading level',
    color: '#06B6D4'
  },
  {
    label: 'Teens (13-17)',
    value: 'TEENS',
    description: 'Competitive, social framing with complex reasoning puzzles',
    color: '#8B5CF6'
  }
];

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [audienceCategory, setAudienceCategory] = useState<AudienceCategory>('CHILDREN');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    audienceCategory?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    } else if (displayName.trim().length > 30) {
      newErrors.displayName = 'Display name must be 30 characters or less';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (password.length > 72) {
      newErrors.password = 'Password must be 72 characters or less';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup(displayName.trim(), email.trim().toLowerCase(), password, audienceCategory);
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      if (error.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrors({ email: 'An account with this email already exists' });
      } else if (error.code === 'UNSUPPORTED_AUDIENCE_CATEGORY') {
        setErrors({ audienceCategory: 'Please select a valid audience category' });
      } else if (error.code === 'VALIDATION_ERROR') {
        Alert.alert('Error', error.message || 'Please check your input and try again.');
      } else {
        Alert.alert('Error', error.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedAudience = AUDIENCE_OPTIONS.find((o) => o.value === audienceCategory)!;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="logo-pikpok" size={48} color={Colors.primary} />
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Choose your audience to get personalized puzzles</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={errors.displayName ? Colors.error : Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                maxLength={30}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                textContentType="name"
                editable={!loading}
              />
            </View>
            {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? Colors.error : Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? Colors.error : Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="•••••••• (min 8 chars)"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                textContentType="newPassword"
                editable={!loading}
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? Colors.error : Colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                textContentType="newPassword"
                editable={!loading}
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Audience Category</Text>
            <View style={styles.audienceSelector}>
              {AUDIENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.audienceOption,
                    audienceCategory === option.value && styles.audienceOptionSelected,
                    { borderColor: audienceCategory === option.value ? option.color : Colors.border }
                  ]}
                  onPress={() => setAudienceCategory(option.value)}
                  disabled={loading}
                >
                  <View style={[styles.audienceOptionColor, { backgroundColor: option.color }]} />
                  <View style={styles.audienceOptionContent}>
                    <Text style={[
                      styles.audienceOptionLabel,
                      audienceCategory === option.value && { color: option.color }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.audienceOptionDescription,
                      audienceCategory === option.value && { color: option.color }
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                  {audienceCategory === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color={option.color} style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.audienceCategory && <Text style={styles.errorText}>{errors.audienceCategory}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonLoading]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonSpinner}>
                <Text style={styles.spinnerText}>Creating account...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Add missing import
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  title: {
    fontSize: Typography.fontSize.xl * 1.5,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center'
  },
  form: {
    width: '100%',
    gap: Spacing.lg
  },
  inputGroup: {
    gap: Spacing.xs
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md
  },
  inputIcon: {
    marginRight: Spacing.sm
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error
  },
  audienceSelector: {
    gap: Spacing.md
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: Spacing.md
  },
  audienceOptionSelected: {
    backgroundColor: Colors.primary + '05'
  },
  audienceOptionColor: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  audienceOptionContent: {
    flex: 1,
    gap: 2
  },
  audienceOptionLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary
  },
  audienceOptionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  },
  checkmark: {
    marginLeft: Spacing.sm
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitButtonLoading: {
    opacity: 0.8
  },
  buttonSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  spinnerText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white
  },
  submitButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs
  },
  footerText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary
  },
  footerLink: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary
  }
});