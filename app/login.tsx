import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/lib/useColorScheme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registeredMessage?: string }>();
  const { colors } = useColorScheme();
  const { login, isLoading, error, clearError, isAuthenticated, isInitializing } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const registrationMessage = useMemo(() => {
    const value = params.registeredMessage;
    if (!value) return null;
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value;
  }, [params.registeredMessage]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  useEffect(() => {
    if (registrationMessage) {
      setSuccessMessage(registrationMessage);
    }
  }, [registrationMessage]);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(
    () => () => {
      setFormError(null);
      clearError();
      setSuccessMessage(null);
    },
    [clearError]
  );

  const handleSubmit = useCallback(async () => {
    clearError();
    setSuccessMessage(null);
    if (!username.trim() || !password) {
      setFormError('Username and password are required.');
      return;
    }

    try {
      await login(username.trim(), password);
      setFormError(null);
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login. Please try again.';
      setFormError(message);
    }
  }, [clearError, login, password, router, username]);

  const disabled = isLoading;

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}>
      <View className="flex-1 justify-center gap-8 bg-background px-6 py-12">
        <View className="gap-2">
          <Text variant="title1" className="font-semibold text-foreground">
            Welcome back
          </Text>
          <Text color="tertiary">Please sign in to continue.</Text>
        </View>

        <View className="gap-4">
          <View className="gap-2">
            <Text variant="subhead" className="text-foreground">
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                if (formError) setFormError(null);
                clearError();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your username"
              placeholderTextColor={colors.grey}
              textContentType="username"
              className="h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground"
            />
          </View>

          <View className="gap-2">
            <Text variant="subhead" className="text-foreground">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (formError) setFormError(null);
                clearError();
              }}
              placeholder="Enter your password"
              placeholderTextColor={colors.grey}
              secureTextEntry
              textContentType="password"
              className="h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground"
            />
          </View>

          {/* {successMessage && (
            <Text variant="footnote" className="text-emerald-500 dark:text-emerald-400">
              {successMessage}
            </Text>
          )} */}
          {(formError || error) && (
            <Text color="destructive" variant="footnote">
              {formError || error}
            </Text>
          )}
        </View>

        <View className="gap-3">
          <Button onPress={handleSubmit} disabled={disabled}>
            <Text className="text-white">{isLoading ? 'Signing in...' : 'Sign in'}</Text>
          </Button>

          <Button
            variant="secondary"
            disabled={disabled}
            onPress={() => {
              router.push('/register');
            }}>
            <Text>Register</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

