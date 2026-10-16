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
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { LoginHeroIllustration } from '@/components/LoginHeroIllustration';
import { useAuth } from '@/context/AuthContext';
import { formatAuthError } from '@/api/client';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const KeyboardAvoid = KeyboardAvoidingView as any;
const AppStatusBar = StatusBar as any;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/feed');
    } catch (error) {
      setErrorMessage(formatAuthError(error, 'Failed to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password recovery is not available yet. Please contact support if you lost access to your account.'
    );
  };

  // Guest mode: browse the skeleton feed without an account. All tab screens
  // tolerate a null user.
  const handleExploreGuest = () => {
    router.replace('/(tabs)/feed');
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
          {/* Top Brand Header matching ScrollMind login.svg: [Icon] PikPok */}
          <View style={styles.topBrandRow}>
            <View style={styles.brandIconSquare}>
              <Ionicons name="sparkles" size={17} color={Colors.white} />
            </View>
            <Text style={styles.brandWordmark}>PikPok</Text>
          </View>

          {/* Central Hero Illustration (matches exact SVG artwork) */}
          <LoginHeroIllustration />

          {/* Headings matching ScrollMind login.svg */}
          <View style={styles.headingSection}>
            <Text style={styles.mainHeading}>Welcome back.</Text>
            <Text style={styles.subHeading}>Ready to train your brain today?</Text>
          </View>

          {/* Error Message if any */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Inputs Section */}
          <View style={styles.formSection}>
            {/* Email Address Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View
                style={[
                  styles.inputContainer,
                  emailFocused && styles.inputContainerFocused,
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
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputContainerFocused,
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
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.neutral[500]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
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

            {/* Forgot Password Link (right-aligned, from SVG) */}
            <TouchableOpacity
              style={styles.forgotPasswordRow}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Coral Pill Primary CTA Button (matches line 54 of login.svg) */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={Colors.secondary[800]} size="small" />
              ) : (
                <View style={styles.loginButtonContent}>
                  <Text style={styles.loginButtonText}>Log In</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={Colors.secondary[800]}
                    style={styles.buttonArrow}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Secondary Option: Guest Exploration */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleExploreGuest}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.guestButtonText}>Explore Feed Skeleton</Text>
              <Ionicons name="sparkles-outline" size={15} color={Colors.neutral[700]} />
            </TouchableOpacity>
          </View>

          {/* Footer Row matching ScrollMind login.svg */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to PikPok? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/signup')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    alignItems: 'stretch',
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
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
    marginTop: 6,
    marginBottom: 20,
  },
  mainHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 30,
    color: Colors.secondary[800],
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subHeading: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.neutral[600],
    letterSpacing: -0.2,
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
  inputLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.secondary[800],
    marginBottom: 8,
    letterSpacing: -0.2,
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
  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.secondary[800],
  },
  loginButton: {
    backgroundColor: '#FF684A',
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF684A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17,
    color: Colors.secondary[800],
    marginRight: 10,
    letterSpacing: -0.3,
  },
  buttonArrow: {
    marginTop: 1,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[150],
    height: 46,
    borderRadius: 23,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  guestButtonText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.neutral[700],
    marginRight: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.neutral[600],
  },
  signUpLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.secondary[800],
    textDecorationLine: 'underline',
  },
});
