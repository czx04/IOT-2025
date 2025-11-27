import { Redirect, router } from 'expo-router';
import React from 'react';
import { ScrollView, View, Pressable } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';

export default function TrackScreen() {
  const { isAuthenticated, isInitializing } = useAuth();

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

  return <TrackHome />;
}

function TrackHome() {
  const menuItems = [
    {
      id: 'daily-data',
      title: 'Dữ liệu theo ngày',
      description: 'Xem chi tiết dữ liệu sức khỏe theo ngày',
      route: '/(tabs)/track/daily-data',
    },
    {
      id: 'statistics',
      title: 'Thống kê',
      description: 'Biểu đồ và phân tích xu hướng',
      route: '/(tabs)/track/statistics',
      disabled: true,
    },
    {
      id: 'history',
      title: 'Lịch sử',
      description: 'Xem lại dữ liệu các ngày trước',
      route: '/(tabs)/track/history',
      disabled: true,
    },
    {
      id: 'reports',
      title: 'Báo cáo',
      description: 'Xuất báo cáo sức khỏe',
      route: '/(tabs)/track/reports',
      disabled: true,
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 64, paddingBottom: 32 }}>
      <View className="px-4 py-4 gap-4">
        <View className="mb-4">
          <Text className="text-3xl font-bold text-foreground mb-2">
            Theo dõi sức khỏe
          </Text>
          <Text className="text-foreground/60">
            Chọn tính năng bạn muốn sử dụng
          </Text>
        </View>

        {menuItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (!item.disabled) {
                router.push(item.route as any);
              }
            }}
            className={`rounded-xl border border-border bg-card p-5 shadow-sm shadow-black/10 dark:shadow-none ${
              item.disabled ? 'opacity-50' : ''
            }`}
            disabled={item.disabled}
          >
            <View className="flex-row items-center gap-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground mb-1">
                  {item.title}
                </Text>
                <Text className="text-sm text-foreground/60">
                  {item.description}
                </Text>
                {item.disabled && (
                  <Text className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Sắp ra mắt
                  </Text>
                )}
              </View>
              {!item.disabled && (
                <Text className="text-2xl text-foreground/40">›</Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
