import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCurrentUser, login as loginRequest, updateUserProfile, isProfileIncomplete, type AuthUser } from '@/lib/auth';
import { updateWidgetData } from '@/lib/widget';

type AuthContextValue = {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  needsProfileCompletion: boolean;
  login: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (userData: AuthUser) => Promise<string>;
  completeProfile: (data: Partial<AuthUser>) => Promise<void>;
};

type PersistedAuth = {
  accessToken: string;
  expiresAt: number;
};

const TOKEN_STORAGE_KEY = '@iot-app/auth-token';
const TOKEN_TTL_MS = 60 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  const clearPersistedAuth = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const persistAuth = useCallback(async (payload: PersistedAuth) => {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setExpiresAt(null);
    setUser(null);
    setError(null);
    await clearPersistedAuth();
    // Remove BLE device ID on logout
    try {
      await AsyncStorage.removeItem('@iot-app/ble-device-id');
    } catch {}
  }, [clearPersistedAuth]);

  const fetchUserProfile = useCallback(
    async (token: string) => {
      const profile = await getCurrentUser(token);
      setUser(profile);
      setNeedsProfileCompletion(isProfileIncomplete(profile));
      
      // Update widget data when profile is loaded
      await updateWidgetData(profile);
    },
    []
  );

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await loginRequest(username, password);
        const expiration = Date.now() + TOKEN_TTL_MS;

        setAccessToken(token);
        setExpiresAt(expiration);
        await persistAuth({ accessToken: token, expiresAt: expiration });
        await fetchUserProfile(token);
        return token;
      } catch (err) {
        await logout();
        const message = err instanceof Error ? err.message : 'Unable to login. Please try again.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserProfile, logout, persistAuth]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    try {
      await fetchUserProfile(accessToken);
    } catch (err) {
      await logout();
      throw err;
    }
  }, [accessToken, fetchUserProfile, logout]);

  const updateProfile = useCallback(
    async (userData: AuthUser) => {
      if (!accessToken) {
        throw new Error('Not authenticated.');
      }
      setIsLoading(true);
      setError(null);

      try {
        const message = await updateUserProfile(accessToken, userData);
        await fetchUserProfile(accessToken);
        
        // Update widget data after successful profile update
        await updateWidgetData(userData);
        
        return message;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to update profile. Please try again.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, fetchUserProfile]
  );

  const completeProfile = useCallback(
    async (data: Partial<AuthUser>) => {
      if (!accessToken || !user) {
        throw new Error('Not authenticated.');
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const updatedUser: AuthUser = {
          ...user,
          name: data.name ?? user.name,
          date_of_birth: data.date_of_birth ?? user.date_of_birth,
          gender: data.gender ?? user.gender,
          height: data.height ?? user.height,
          weight: data.weight ?? user.weight,
        };
        
        await updateUserProfile(accessToken, updatedUser);
        await fetchUserProfile(accessToken);
        setNeedsProfileCompletion(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to update profile. Please try again.';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, user, fetchUserProfile]
  );

  useEffect(() => {
    let isActive = true;

    async function bootstrapAuth() {
      try {
        const storedValue = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedValue) {
          return;
        }

        const parsed: PersistedAuth | null = safeParseAuth(storedValue);
        if (!parsed) {
          await clearPersistedAuth();
          return;
        }

        if (parsed.expiresAt <= Date.now()) {
          await clearPersistedAuth();
          return;
        }

        try {
          const profile = await getCurrentUser(parsed.accessToken);
          if (!isActive) return;
          setAccessToken(parsed.accessToken);
          setExpiresAt(parsed.expiresAt);
          setUser(profile);
        } catch (error) {
          await clearPersistedAuth();
          if (!isActive) return;
          setAccessToken(null);
          setExpiresAt(null);
          setUser(null);
          const message =
            error instanceof Error ? error.message : 'Session expired. Please sign in.';
          setError(message);
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, [clearPersistedAuth]);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      void logout();
      return;
    }

    const timeout = setTimeout(() => {
      void logout();
    }, remaining);

    return () => {
      clearTimeout(timeout);
    };
  }, [expiresAt, logout]);

  const isTokenValid = accessToken != null && expiresAt != null && expiresAt > Date.now();

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(isTokenValid && user),
      isInitializing,
      isLoading,
      error,
      needsProfileCompletion,
      login,
      logout,
      clearError,
      refreshUser,
      updateProfile,
      completeProfile,
    }),
    [
      accessToken,
      user,
      isTokenValid,
      isInitializing,
      isLoading,
      error,
      needsProfileCompletion,
      login,
      logout,
      clearError,
      refreshUser,
      updateProfile,
      completeProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function safeParseAuth(value: string): PersistedAuth | null {
  try {
    const parsed = JSON.parse(value) as PersistedAuth;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      Number.isNaN(parsed.expiresAt)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
