import { useActionSheet } from '@expo/react-native-action-sheet';
import { Redirect } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { DatePicker } from '@/components/nativewindui/DatePicker';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { getLatestData, getMeasurements, type LatestData, type Measurement } from '@/lib/auth';

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

  return <AuthorizedTrack />;
}

function AuthorizedTrack() {
  const { accessToken } = useAuth();
  const [latestData, setLatestData] = React.useState<LatestData | null>(null);
  const [measurements, setMeasurements] = React.useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [limit, setLimit] = React.useState<number>(10);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = React.useState(false);
  const { colors, colorScheme } = useColorScheme();
  const { showActionSheetWithOptions } = useActionSheet();

  // Fetch latest data only once on mount
  React.useEffect(() => {
    async function fetchLatestData() {
      if (!accessToken) {
        return;
      }

      try {
        const latest = await getLatestData(accessToken);
        setLatestData(latest);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatestData();
  }, [accessToken]);

  // Hàm để fetch measurements khi nhấn nút lọc
  const handleFilter = React.useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoadingMeasurements(true);
    setError(null);

    try {
      const params: { start_date?: string; end_date?: string; limit?: number } = {
        limit: limit,
      };

      // Chỉ gửi cả hai ngày nếu cả hai đều được chọn
      if (startDate && endDate) {
        params.start_date = formatDateForAPI(startDate);
        params.end_date = formatDateForAPI(endDate);
      }

      const measurementsData = await getMeasurements(accessToken, params);
      setMeasurements(measurementsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách đo.';
      setError(message);
    } finally {
      setIsLoadingMeasurements(false);
    }
  }, [accessToken, startDate, endDate, limit]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 24 }}>
        <View className="px-4 py-4">
          <Card title="Lỗi">
            <Text variant="subhead" className="text-center text-destructive">
              {error}
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  if (!latestData) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 24 }}>
        <View className="px-4 py-4">
          <Card title="Dữ liệu đo">
            <Text variant="subhead" className="text-center text-foreground">
              Không có dữ liệu
            </Text>
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 64 }}>
      <View className="px-4 py-4 gap-4">
        <Card title="Dữ liệu đo mới nhất">
          <View className="gap-3">
            <DataRow label="Nhịp tim (HR)" value={`${latestData.hr} bpm`} />
            <DataRow label="SpO2" value={`${latestData.spo2}%`} />
            <DataRow label="Thời gian" value={formatTimestamp(latestData.timestamp)} />
          </View>
        </Card>

        <Card title="Lịch sử đo">
          <View className="gap-4">
            <View className="gap-3">
              <View className="gap-2">
                <Text variant="subhead" className="font-semibold text-foreground">
                  Từ ngày:
                </Text>
                <DatePicker
                  value={startDate || new Date()}
                  mode="date"
                  onChange={(ev) => {
                    setStartDate(new Date(ev.nativeEvent.timestamp));
                  }}
                  materialDateLabel="Từ ngày"
                />
              </View>
              <View className="gap-2">
                <Text variant="subhead" className="font-semibold text-foreground">
                  Đến ngày:
                </Text>
                <DatePicker
                  value={endDate || new Date()}
                  mode="date"
                  onChange={(ev) => {
                    setEndDate(new Date(ev.nativeEvent.timestamp));
                  }}
                  materialDateLabel="Đến ngày"
                />
              </View>
              <View className="gap-2">
                <Text variant="subhead" className="font-semibold text-foreground">
                  Số lượng:
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => {
                    const options = ['5', '10', '20', '50', '100', 'Hủy'];
                    const cancelButtonIndex = 5;
                    const limitOptions = [5, 10, 20, 50, 100];

                    showActionSheetWithOptions(
                      {
                        options,
                        cancelButtonIndex,
                        containerStyle: {
                          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
                        },
                        textStyle: {
                          color: colors.foreground,
                        },
                      },
                      (selectedIndex) => {
                        if (selectedIndex !== undefined && selectedIndex !== cancelButtonIndex) {
                          setLimit(limitOptions[selectedIndex]);
                        }
                      }
                    );
                  }}>
                  <View className="flex-row items-center gap-2">
                    <Text>{limit}</Text>
                    <Icon name="chevron.down" size={16} color={colors.foreground} />
                  </View>
                </Button>
              </View>
              <View className="flex-row gap-2">
                <Button
                  variant="primary"
                  onPress={handleFilter}
                  disabled={isLoadingMeasurements}
                  className="flex-1">
                  <Text>Lọc</Text>
                </Button>
                {(startDate || endDate || measurements.length > 0) && (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setStartDate(null);
                      setEndDate(null);
                      setLimit(10);
                      setMeasurements([]);
                    }}>
                    <Text>Xóa</Text>
                  </Button>
                )}
              </View>
            </View>

            {measurements.length > 0 && (
              <View className="border-t border-border pt-4">
                {isLoadingMeasurements ? (
                  <View className="py-4">
                    <ActivityIndicator />
                  </View>
                ) : (
                  <View className="gap-3">
                    {measurements.map((measurement) => (
                      <MeasurementItem key={measurement.id} measurement={measurement} />
                    ))}
                  </View>
                )}
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

function MeasurementItem({ measurement }: { measurement: Measurement }) {
  return (
    <View className="rounded-lg border border-border bg-background p-3">
      <View className="gap-2">
        <View className="flex-row justify-between">
          <Text variant="subhead" className="font-semibold text-foreground">
            Nhịp tim (HR):
          </Text>
          <Text variant="subhead" className="text-foreground">
            {measurement.hr} bpm
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text variant="subhead" className="font-semibold text-foreground">
            SpO2:
          </Text>
          <Text variant="subhead" className="text-foreground">
            {measurement.spo2}%
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text variant="subhead" className="font-semibold text-foreground">
            Thời gian:
          </Text>
          <Text variant="subhead" className="text-foreground">
            {formatTimestamp(measurement.timestamp)}
          </Text>
        </View>
      </View>
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

function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

