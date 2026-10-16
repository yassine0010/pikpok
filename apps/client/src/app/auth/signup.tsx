import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { formatAuthError } from '@/api/client';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const KeyboardAvoid = KeyboardAvoidingView as any;
const AppStatusBar = StatusBar as any;

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeField, setActiveField] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Please enter your display name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 6 || ageNum > 120) {
      setErrorMessage('Please enter a valid age (e.g. 18)');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    try {
      await signup({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        age: ageNum,
      });
      router.replace('/(tabs)/feed');
    } catch (error) {
      setErrorMessage(formatAuthError(error, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppStatusBar style="dark" />

      <KeyboardAvoid
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Header */}
          <View style={styles.topBrandRow}>
            <View style={styles.brandIconSquare}>
              <Ionicons name="sparkles" size={17} color={Colors.white} />
            </View>
            <Text style={styles.brandWordmark}>PikPok</Text>
          </View>

          {/* Heading Section */}
          <View style={styles.headingSection}>
            <Text style={styles.mainHeading}>Create Account</Text>
            <Text style={styles.subHeading}>
              Join the daily puzzle arena and start training your brain.
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <View
                style={[
                  styles.inputContainer,
                  activeField === 'displayName' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={Colors.neutral[600]}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="e.g. Alex Rivers"
                  placeholderTextColor={Colors.neutral[500]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => setActiveField('displayName')}
                  onBlur={() => setActiveField(null)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  activeField === 'email' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.neutral[600]}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="your.email@example.com"
                  placeholderTextColor={Colors.neutral[500]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  activeField === 'password' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.neutral[600]}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.neutral[500]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.neutral[600]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Age Field (Required profile info per project spec) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithBadge}>
                <Text style={styles.inputLabel}>Age</Text>
                <Text style={styles.badgeText}>(Profile info)</Text>
              </View>
              <View
                style={[
                  styles.inputContainer,
                  activeField === 'age' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.neutral[600]}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="e.g. 21"
                  placeholderTextColor={Colors.neutral[500]}
                  value={age}
                  onChangeText={setAge}
                  onFocus={() => setActiveField('age')}
                  onBlur={() => setActiveField(null)}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
              </View>
            </View>

            {/* Create Account Button (Coral Pill) */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={Colors.secondary[800]} size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={Colors.secondary[800]}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerHighlight}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoid>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    alignItems: 'stretch',
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  brandIconSquare: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FF684A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#FF684A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  brandWordmark: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.secondary[800],
    letterSpacing: -0.5,
  },
  headingSection: {
    marginBottom: 20,
  },
  mainHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: Colors.secondary[800],
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subHeading: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    marginLeft: 8,
    flex: 1,
  },
  formSection: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.secondary[800],
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.neutral[500],
    marginLeft: 6,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8DFD7',
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  fieldIcon: {
    marginRight: 12,
  },
  textInputField: {
    flex: 1,
    height: '100%',
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
  },
  primaryButton: {
    backgroundColor: '#FF684A',
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF684A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.secondary[800],
    marginRight: 10,
    letterSpacing: -0.3,
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.neutral[600],
  },
  footerHighlight: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.secondary[800],
    textDecorationLine: 'underline',
  },
});
