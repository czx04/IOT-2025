import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import Svg, { Path, Rect, Line, Polyline as SvgPolyline } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { getHealthRecord, getDailySummary, type HealthRecord, type DailySummary } from '@/lib/auth';

// --- ICONS (Đồng bộ với các màn hình trước) ---

function CalendarIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function ChevronLeft({ size = 24, color = '#64748B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ChevronRight({ size = 24, color = '#64748B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function HeartIcon({ size = 20, color = '#FF9A8B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  );
}

function DropIcon({ size = 20, color = '#3B82F6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c0 0-7 8.5-7 14.5 0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5C19.5 10.5 12 2 12 2z" />
    </Svg>
  );
}

function FlameIcon({ size = 20, color = '#F97316' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </Svg>
  );
}

// --- MAIN SCREEN ---

export default function DailyDataScreen() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeVN = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
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
      const dateStr = formatDateAPI(date);
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

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const today = new Date();
    if (next <= today) {
        setSelectedDate(next);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9A8B" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9A8B" />
      }
    >
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.headerIconContainer}>
                <CalendarIcon size={32} color="#FFF" />
            </View>
            <View>
                <Text style={styles.headerTitle}>Dữ liệu chi tiết</Text>
                <Text style={styles.headerSubtitle}>Xem lại lịch sử đo</Text>
            </View>
        </View>

        {/* Date Selector (Custom UI) */}
        <View style={styles.dateSelectorCard}>
            <TouchableOpacity onPress={goToPreviousDay} style={styles.arrowButton}>
                <ChevronLeft size={24} color="#FF9A8B" />
            </TouchableOpacity>
            
            <View style={styles.dateDisplay}>
                <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
                {isToday && <Text style={styles.todayLabel}>Hôm nay</Text>}
            </View>

            <TouchableOpacity 
                onPress={goToNextDay} 
                style={[styles.arrowButton, isToday && styles.arrowButtonDisabled]}
                disabled={isToday}
            >
                <ChevronRight size={24} color={isToday ? '#E2E8F0' : '#FF9A8B'} />
            </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#FF9A8B" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        )}

        {/* Error / Empty State */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Summary Section */}
        {!loading && summary && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tổng kết ngày</Text>
            
            <View style={styles.summaryGrid}>
                {/* Heart Rate Summary */}
                {summary.heart_rate && (
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FF9A8B' }]}>
                            <HeartIcon size={18} color="#FFF" />
                        </View>
                        <Text style={styles.cardLabel}>Nhịp tim TB</Text>
                        <Text style={styles.cardValue}>{summary.heart_rate.avg.toFixed(0)} <Text style={styles.unit}>bpm</Text></Text>
                        <View style={styles.minMaxRow}>
                            <Text style={styles.minMaxText}>Min: {summary.heart_rate.min}</Text>
                            <Text style={styles.minMaxText}>Max: {summary.heart_rate.max}</Text>
                        </View>
                    </View>
                )}

                {/* SpO2 Summary */}
                {summary.spo2 && (
                    <View style={styles.summaryCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
                            <DropIcon size={18} color="#FFF" />
                        </View>
                        <Text style={styles.cardLabel}>SpO2 TB</Text>
                        <Text style={styles.cardValue}>{summary.spo2.avg.toFixed(0)} <Text style={styles.unit}>%</Text></Text>
                        <View style={styles.minMaxRow}>
                            <Text style={styles.minMaxText}>Min: {summary.spo2.min}</Text>
                            <Text style={styles.minMaxText}>Max: {summary.spo2.max}</Text>
                        </View>
                    </View>
                )}

                {/* Calories Summary */}
                {summary.calories && (
                    <View style={[styles.summaryCard, styles.fullWidthCard]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconCircle, { backgroundColor: '#F97316' }]}>
                                <FlameIcon size={18} color="#FFF" />
                            </View>
                            <Text style={styles.cardLabel}>Tiêu thụ năng lượng</Text>
                        </View>
                        <View style={styles.caloriesRow}>
                            <Text style={styles.cardValue}>{summary.calories.total.toFixed(0)} <Text style={styles.unit}>kcal</Text></Text>
                            <Text style={styles.subValue}>~{summary.calories.avg_per_hour.toFixed(1)} kcal/giờ</Text>
                        </View>
                    </View>
                )}
            </View>
          </View>
        )}

        {/* Detailed Records List */}
        {!loading && healthRecord && healthRecord.data.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Chi tiết ({healthRecord.data.length} bản ghi)</Text>
            
            <View style={styles.listContainer}>
                {healthRecord.data.slice(0, 20).map((record, index) => (
                    <View key={`${record.timestamp}-${index}`} style={styles.recordRow}>
                        <View style={styles.timeColumn}>
                            <Text style={styles.timeText}>{formatTimeVN(record.timestamp)}</Text>
                            <View style={styles.verticalLine} />
                        </View>
                        
                        <View style={styles.dataColumn}>
                            <View style={styles.dataBadgeContainer}>
                                {record.heart_rate && (
                                    <View style={[styles.dataBadge, getStatusStyle(record.heart_rate.status)]}>
                                        <HeartIcon size={14} color="#64748B" />
                                        <Text style={styles.badgeText}>{record.heart_rate.value} bpm</Text>
                                    </View>
                                )}
                                {record.spo2 && (
                                    <View style={[styles.dataBadge, getStatusStyle(record.spo2.status)]}>
                                        <Text style={[styles.badgeLabel, {color:'#3B82F6'}]}>O₂</Text>
                                        <Text style={styles.badgeText}>{record.spo2.value}%</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ))}
                
                {healthRecord.data.length > 20 && (
                    <Text style={styles.moreText}>
                        ...và {healthRecord.data.length - 20} bản ghi khác
                    </Text>
                )}
            </View>
          </View>
        )}
    </ScrollView>
  );
}

// Helper for badge styles
function getStatusStyle(status: 'normal' | 'high' | 'low') {
    switch (status) {
        case 'high': return { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }; // Red
        case 'low': return { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }; // Yellow
        default: return { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }; // Green
    }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F6',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFAB9D',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFAB9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },

  // Date Selector Styles
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  arrowButton: {
    padding: 8,
    backgroundColor: '#FFF0EC',
    borderRadius: 12,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  todayLabel: {
    fontSize: 12,
    color: '#FF9A8B',
    fontWeight: '600',
    marginTop: 2,
  },

  // State Styles
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  errorText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },

  // Summary Section
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginLeft: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthCard: {
    minWidth: '100%',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFF0EC',
  },
  minMaxText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  subValue: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // List Styles
  listContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  recordRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 1,
  },
  dataColumn: {
    flex: 1,
    paddingBottom: 16,
  },
  dataBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  moreText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 8,
  }
});