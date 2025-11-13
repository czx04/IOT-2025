import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/lib/auth';
import { useColorScheme } from '@/lib/useColorScheme';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useColorScheme();
  const { user, isAuthenticated, isInitializing, refreshUser, logout, isLoading, updateProfile, error, clearError } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AuthUser>>({});

  useEffect(() => {
    if (isAuthenticated) {
      void refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        username: user.username,
        name: user.name,
        date_of_birth: user.date_of_birth ?? '',
        gender: user.gender ?? '',
        height: user.height,
        weight: user.weight,
      });
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setFormError(null);
    clearError();
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (user) {
      setFormData({
        id: user.id,
        username: user.username,
        name: user.name,
        date_of_birth: user.date_of_birth ?? '',
        gender: user.gender ?? '',
        height: user.height,
        weight: user.weight,
      });
    }
    setIsEditing(false);
    setFormError(null);
    clearError();
  }, [user, clearError]);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setFormError(null);
    clearError();
    setIsSaving(true);

    try {
      const updatedData: AuthUser = {
        id: formData.id ?? user.id,
        username: formData.username ?? user.username,
        name: formData.name ?? user.name,
        date_of_birth: formData.date_of_birth && formData.date_of_birth.trim() ? formData.date_of_birth : null,
        gender: formData.gender && formData.gender.trim() ? formData.gender : null,
        height: formData.height ?? user.height,
        weight: formData.weight ?? user.weight,
      };

      await updateProfile(updatedData);
      setIsEditing(false);
      setFormError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update profile. Please try again.';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [user, formData, updateProfile, clearError]);

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-6 gap-6"
        contentInsetAdjustmentBehavior="automatic">
        <View className="gap-2">
          <Text variant="title2" className="font-semibold">
            Profile
          </Text>
          <Text color="tertiary">
            {isEditing ? 'Edit your personal details.' : 'Review your personal details.'}
          </Text>
        </View>

        {user ? (
          <View className="gap-4 rounded-xl border border-border bg-card p-4">
            {isEditing ? (
              <>
                <InputField
                  label="Full name"
                  value={formData.name ?? ''}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                  colors={colors}
                />
                <InputField
                  label="Username"
                  value={formData.username ?? ''}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, username: value }))}
                  colors={colors}
                  autoCapitalize="none"
                />
                <InputField
                  label="Date of birth (YYYY-MM-DD)"
                  value={formData.date_of_birth ?? ''}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, date_of_birth: value }))}
                  colors={colors}
                  placeholder="e.g., 1990-01-15"
                />
                <InputField
                  label="Gender"
                  value={formData.gender ?? ''}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  colors={colors}
                  placeholder="e.g., Male, Female, Other"
                />
                <InputField
                  label="Height (cm)"
                  value={formData.height?.toString() ?? '0'}
                  onChangeText={(value) => {
                    const num = parseInt(value, 10);
                    if (!Number.isNaN(num)) {
                      setFormData((prev) => ({ ...prev, height: num }));
                    } else if (value === '') {
                      setFormData((prev) => ({ ...prev, height: 0 }));
                    }
                  }}
                  colors={colors}
                  keyboardType="numeric"
                />
                <InputField
                  label="Weight (kg)"
                  value={formData.weight?.toString() ?? '0'}
                  onChangeText={(value) => {
                    const num = parseInt(value, 10);
                    if (!Number.isNaN(num)) {
                      setFormData((prev) => ({ ...prev, weight: num }));
                    } else if (value === '') {
                      setFormData((prev) => ({ ...prev, weight: 0 }));
                    }
                  }}
                  colors={colors}
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                <ProfileRow label="Full name" value={user.name || '—'} />
                <ProfileRow label="Username" value={user.username} />
                <ProfileRow label="Date of birth" value={formatDate(user.date_of_birth)} />
                <ProfileRow label="Gender" value={capitalize(user.gender)} />
                <ProfileRow label="Height" value={`${user.height} cm`} />
                <ProfileRow label="Weight" value={`${user.weight} kg`} />
              </>
            )}

            {(formError || error) && (
              <Text color="destructive" variant="footnote">
                {formError || error}
              </Text>
            )}

            {isEditing ? (
              <View className="gap-3 pt-2">
                <Button onPress={handleSave} disabled={isSaving || isLoading}>
                  <Text className="text-white">{isSaving ? 'Saving...' : 'Save changes'}</Text>
                </Button>
                <Button variant="secondary" onPress={handleCancel} disabled={isSaving || isLoading}>
                  <Text>Cancel</Text>
                </Button>
              </View>
            ) : (
              <View className="pt-2">
                <Button variant="secondary" onPress={handleEdit} disabled={isLoading}>
                  <Text>Edit profile</Text>
                </Button>
              </View>
            )}
          </View>
        ) : (
          <View className="rounded-xl border border-border bg-card p-4">
            <Text variant="subhead">Không tìm thấy thông tin người dùng.</Text>
          </View>
        )}

        <Button
          variant="secondary"
          onPress={() => {
            void logout().then(() => {
              router.replace('/login');
            });
          }}
          disabled={isLoading || isSaving}>
          <Text>Log out</Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text variant="subhead" className="font-semibold text-foreground">
        {label}
      </Text>
      <Text variant="subhead" className="text-foreground">
        {value}
      </Text>
    </View>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColorScheme>['colors'];
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
};

function InputField({
  label,
  value,
  onChangeText,
  colors,
  placeholder,
  autoCapitalize,
  keyboardType,
}: InputFieldProps) {
  return (
    <View className="gap-2">
      <Text variant="subhead" className="font-semibold text-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.grey}
        className="h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function formatDate(date: string | null) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  try {
    return parsed.toLocaleDateString();
  } catch {
    return date;
  }
}

function capitalize(value: string | null) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
