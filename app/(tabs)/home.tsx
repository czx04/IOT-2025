import { Redirect } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { createWebSocketConnection, type HealthData } from '@/lib/websocket';

export default function HomeScreen() {
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

  return <AuthorizedHome />;
}

function AuthorizedHome() {
  const { accessToken } = useAuth();
  const [healthData, setHealthData] = React.useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    if (!accessToken) {
      return;
    }

    // Tạo WebSocket connection
    const ws = createWebSocketConnection(accessToken);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: HealthData = JSON.parse(event.data);
        setHealthData(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
        setError('Lỗi khi nhận dữ liệu');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Lỗi kết nối WebSocket');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    // Cleanup khi component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [accessToken]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 64 }}>
      <View className="px-4 py-4 gap-4">
        <Card title="Dữ liệu sức khỏe real-time">
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text variant="subhead" className="font-semibold text-foreground">
                Trạng thái:
              </Text>
              <View className="flex-row items-center gap-2">
                <View
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <Text variant="subhead" className="text-foreground">
                  {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                </Text>
              </View>
            </View>

            {error && (
              <View className="rounded-lg bg-destructive/10 p-3">
                <Text variant="subhead" className="text-center text-destructive">
                  {error}
                </Text>
              </View>
            )}

            {healthData ? (
              <View className="gap-3">
                <DataRow label="Nhịp tim (HR)" value={`${healthData.hr} bpm`} />
                <DataRow label="SpO2" value={`${healthData.spo2}%`} />
                <DataRow label="Thời gian" value={formatTimestamp(healthData.timestamp)} />
              </View>
            ) : (
              <View className="py-4">
                <ActivityIndicator />
                <Text variant="subhead" className="mt-4 text-center text-foreground">
                  Đang chờ dữ liệu...
                </Text>
              </View>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="gap-4 rounded-xl border border-border bg-card p-4 pb-6 shadow-sm shadow-black/10 dark:shadow-none">
      <Text className="text-center text-sm font-medium tracking-wider opacity-60">{title}</Text>
      {children}
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="subhead" className="font-semibold text-foreground">
        {label}:
      </Text>
      <Text variant="subhead" className="text-foreground">
        {value}
      </Text>
    </View>
  );
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

