import { useAuth as useAuthContext } from '@/store/authStore';

/**
 * Re-export the useAuth hook from the auth store.
 * This provides a consistent import path (@/hooks/useAuth) across the app.
 */
export const useAuth = useAuthContext;