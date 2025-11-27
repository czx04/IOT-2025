import { Stack } from 'expo-router';
import React from 'react';

export default function TrackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Theo dõi sức khỏe',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="daily-data"
        options={{
          title: 'Dữ liệu theo ngày',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
