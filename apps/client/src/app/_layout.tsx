import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';

// Prevent splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const stackNavigation = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
    </Stack>
  );

  // Responsive layout: on desktop web, cleanly shrink and center to mobile width without fake device mockups
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webBackdrop}>
        <View style={styles.responsiveWrapper}>
          {stackNavigation}
        </View>
      </View>
    );
  }

  return stackNavigation;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
  },
  webBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F5EFEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    height: '100%',
    backgroundColor: Colors.canvas,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.secondary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});
