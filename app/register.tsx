import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { Text } from '@/components/nativewindui/Text';
import { registerAccount } from '@/lib/auth';
import { useColorScheme } from '@/lib/useColorScheme';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useColorScheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetStatus = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    resetStatus();
    if (!username.trim() || !password.trim() || !name.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const resultMessage = await registerAccount(username.trim(), password.trim(), name.trim());
      setUsername('');
      setPassword('');
      setName('');
      router.replace({
        pathname: '/login',
        params: {
          registeredMessage: resultMessage ?? 'Registration successful. You can now sign in.',
        },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unable to register account. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, password, resetStatus, router, username]);

  const handleGoToLogin = useCallback(() => {
    router.replace('/login');
  }, [router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="bg-background px-6 py-12">
        <View className="flex-1 justify-center gap-8">
          <View className="gap-2">
            <Text variant="title1" className="font-semibold text-foreground">
              Create your account
            </Text>
            <Text color="tertiary">Fill in the information below to get started.</Text>
          </View>

          <View className="gap-4">
            <InputField
              label="Full name"
              value={name}
              placeholder="Enter your full name"
              onChangeText={(value) => {
                setName(value);
                resetStatus();
              }}
              colors={colors}
            />
            <InputField
              label="Username"
              value={username}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Choose a username"
              onChangeText={(value) => {
                setUsername(value);
                resetStatus();
              }}
              colors={colors}
            />
            <InputField
              label="Password"
              value={password}
              secureTextEntry
              placeholder="Create a password"
              onChangeText={(value) => {
                setPassword(value);
                resetStatus();
              }}
              colors={colors}
            />

            {error && (
              <Text color="destructive" variant="footnote">
                {error}
              </Text>
            )}
          </View>

          <View className="gap-4">
            <Button onPress={handleSubmit} disabled={isSubmitting}>
              <Text className="text-white">{isSubmitting ? 'Registering...' : 'Register'}</Text>
            </Button>
            <Button variant="secondary" onPress={handleGoToLogin} disabled={isSubmitting}>
              <Text className="text-foreground">Back to login</Text>
            </Button>
          </View>
        </View>
        {isSubmitting && (
          <View className="absolute inset-0 items-center justify-center bg-black/20">
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColorScheme>['colors'];
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
}: InputFieldProps) {
  return (
    <View className="gap-2">
      <Text variant="subhead" className="text-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.grey}
        className="h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </View>
  );
}

