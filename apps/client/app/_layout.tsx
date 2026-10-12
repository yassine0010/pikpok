import { Stack } from 'expo-router';
import { Providers } from '@/providers';
import { useAuth } from '@/hooks/useAuth';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions
} from 'react-native';

function RootLayoutNav() {
  const { isLoading } = useAuth();
  const { width } = useWindowDimensions();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const stackContent = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
    </Stack>
  );

  // When viewed on web on a screen wider than 500px, constrain to a sleek mobile phone frame
  if (Platform.OS === 'web' && width > 500) {
    return (
      <View style={styles.webBackdrop}>
        <View style={styles.phoneFrame}>
          <View style={{ flex: 1, width: '100%', height: '100%' }}>
            {stackContent}
          </View>
        </View>
      </View>
    );
  }

  return stackContent;
}

export default function RootLayout() {
  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  webBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 880,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30
  }
});