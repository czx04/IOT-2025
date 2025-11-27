import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { DatePicker } from '@/components/nativewindui/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { getHealthRecord, getDailySummary, type HealthRecord, type DailySummary } from '@/lib/auth';

export default function DailyDataScreen() {
  const { accessToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeVN = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    // Convert UTC to Vietnam time (UTC+7)
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const fetchData = async (date: Date, isRefresh = false) => {
    if (!accessToken) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const dateStr = formatDate(date);
      const [recordData, summaryData] = await Promise.all([
        getHealthRecord(accessToken, dateStr).catch(() => null),
        getDailySummary(accessToken, dateStr).catch(() => null),
      ]);
      
      setHealthRecord(recordData);
      setSummary(summaryData);
      
      if (!recordData && !summaryData) {
        setError('Không có dữ liệu cho ngày này');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, accessToken]);

  const onRefresh = () => {
    fetchData(selectedDate, true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 64, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-4 py-4 gap-4">
        {/* Date Selector */}
        <Card title="Chọn ngày">
          <DatePicker
            mode="date"
            value={selectedDate}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        </Card>

        {/* Loading State */}
        {loading && (
          <View className="items-center py-8">
            <ActivityIndicator />
            <Text className="mt-2 text-foreground/60">Đang tải dữ liệu...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card title="Thông báo">
            <Text className="text-center text-foreground/80">{error}</Text>
          </Card>
        )}

        {/* Summary Card */}
        {!loading && summary && (
          <Card title="Tổng kết trong ngày">
            <View className="gap-3">
              {summary.heart_rate && (
                <SummaryItem
                  label="Nhịp tim"
                  avg={summary.heart_rate.avg}
                  min={summary.heart_rate.min}
                  max={summary.heart_rate.max}
                  unit="bpm"
                  measurements={summary.heart_rate.measurements}
                />
              )}
              {summary.spo2 && (
                <SummaryItem
                  label="SpO2"
                  avg={summary.spo2.avg}
                  min={summary.spo2.min}
                  max={summary.spo2.max}
                  unit="%"
                  measurements={summary.spo2.measurements}
                />
              )}
              {summary.calories && (
                <View className="rounded-lg border border-border bg-muted/20 p-3">
                  <Text className="font-semibold text-foreground">Calories</Text>
                  <Text className="mt-1 text-2xl font-bold text-foreground">
                    {summary.calories.total.toFixed(1)} kcal
                  </Text>
                  <Text className="text-sm text-foreground/60">
                    Trung bình: {summary.calories.avg_per_hour.toFixed(1)} kcal/giờ
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Health Records */}
        {!loading && healthRecord && healthRecord.data.length > 0 && (
          <Card title={`Dữ liệu chi tiết (${healthRecord.data.length} bản ghi)`}>
            <View className="gap-3">
              {healthRecord.data.slice(0, 10).map((record, index) => (
                <View
                  key={`${record.timestamp}-${index}`}
                  className="rounded-lg border border-border bg-muted/20 p-3 gap-2"
                >
                  <Text className="text-xs font-semibold text-foreground/60">
                    {formatTimeVN(record.timestamp)}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {record.heart_rate && (
                      <DataBadge
                        label="HR"
                        value={record.heart_rate.value}
                        unit="bpm"
                        status={record.heart_rate.status}
                      />
                    )}
                    {record.spo2 && (
                      <DataBadge
                        label="SpO2"
                        value={record.spo2.value}
                        unit="%"
                        status={record.spo2.status}
                      />
                    )}
                  </View>
                </View>
              ))}
              {healthRecord.data.length > 10 && (
                <Text className="text-center text-sm text-foreground/60">
                  Còn {healthRecord.data.length - 10} bản ghi nữa...
                </Text>
              )}
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function SummaryItem({
  label,
  avg,
  min,
  max,
  unit,
  measurements,
}: {
  label: string;
  avg: number;
  min: number;
  max: number;
  unit: string;
  measurements?: number;
}) {
  return (
    <View className="rounded-lg border border-border bg-muted/20 p-3">
      <Text className="font-semibold text-foreground">{label}</Text>
      <View className="mt-2 flex-row items-baseline gap-2">
        <Text className="text-2xl font-bold text-foreground">
          {avg.toFixed(1)}
        </Text>
        <Text className="text-foreground/60">{unit}</Text>
      </View>
      <View className="mt-2 flex-row gap-4">
        <View>
          <Text className="text-xs text-foreground/60">Min</Text>
          <Text className="font-semibold text-foreground">{min} {unit}</Text>
        </View>
        <View>
          <Text className="text-xs text-foreground/60">Max</Text>
          <Text className="font-semibold text-foreground">{max} {unit}</Text>
        </View>
        {measurements !== undefined && (
          <View>
            <Text className="text-xs text-foreground/60">Đo</Text>
            <Text className="font-semibold text-foreground">{measurements}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DataBadge({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: number;
  unit: string;
  status: 'normal' | 'high' | 'low';
}) {
  const statusColor = 
    status === 'normal' ? 'border-green-500/50' : 
    status === 'high' ? 'border-red-500/50' : 
    'border-yellow-500/50';

  return (
    <View className={`rounded border ${statusColor} bg-background px-2 py-1`}>
      <Text className="text-xs text-foreground/60">{label}</Text>
      <Text className="font-semibold text-foreground">
        {value} {unit}
      </Text>
    </View>
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
