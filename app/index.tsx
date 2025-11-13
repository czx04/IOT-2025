import React from 'react';

import { Redirect } from 'expo-router';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <ActivityIndicator />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
