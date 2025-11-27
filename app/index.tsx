import React from 'react';
import { View } from 'react-native';

import { Redirect } from 'expo-router';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { CompleteProfileModal } from '@/components/CompleteProfileModal';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { isAuthenticated, isInitializing, needsProfileCompletion, completeProfile, user } = useAuth();

  if (isInitializing) {
    return <ActivityIndicator />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Show profile completion modal if needed
  if (needsProfileCompletion && user) {
    return (
      <View className="flex-1 bg-background">
        <CompleteProfileModal
          visible={true}
          initialName={user.name}
          onComplete={async (data) => {
            await completeProfile(data);
          }}
        />
      </View>
    );
  }

  return <Redirect href="/(tabs)/home" />;
}
