/**
 * Auth token persistence.
 *
 * - Native (iOS/Android): `expo-secure-store` (Keychain / encrypted SharedPreferences).
 * - Web (`expo start --web`): `expo-secure-store` has no web support, so we fall
 *   back to `@react-native-async-storage/async-storage` (localStorage on web).
 * - If the native secure store is unavailable (e.g. a weird device/emulator
 *   state), we degrade to an in-memory token so the session survives within the
 *   running app instead of crashing.
 *
 * Only the JWT is ever stored here — never the user's password.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'pikpok.auth.token';

/** Last-known-good token used when the persistent store is unavailable. */
let memoryToken: string | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  memoryToken = token;
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Keep the in-memory token as a best effort.
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // Keep the in-memory token as a best effort.
  }
}

export async function clearAuthToken(): Promise<void> {
  memoryToken = null;
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing else to do.
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Nothing else to do.
  }
}
