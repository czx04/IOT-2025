import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';

// --- ICONS (Vẽ theo phong cách của ProfileScreen) ---

function ActivityIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  );
}

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

function ChartIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  );
}

function DocumentIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1="16" y1="13" x2="8" y2="13" />
      <Line x1="16" y1="17" x2="8" y2="17" />
      <Polyline points="10 9 9 9 8 9" />
    </Svg>
  );
}

// Icon mũi tên nhỏ
function Polyline({ points }: { points: string }) {
  return <Path d={`M${points.replace(/ /g, ',').replace(/,/g, ' ')}`} />;
}

function ChevronRight({ size = 24, color = '#FFC9BE' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export default function TrackScreen() {
  const { isAuthenticated, isInitializing } = useAuth();

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

  return <TrackHome />;
}

function TrackHome() {
  const router = useRouter();

  const menuItems = [
    {
      id: 'daily-data',
      title: 'Dữ liệu theo ngày',
      description: 'Xem chi tiết nhịp tim & SpO2',
      route: '/(tabs)/track/daily-data',
      icon: <ActivityIcon size={20} color="#FFF" />,
      color: '#FF9A8B',
      disabled: false,
    },
    {
      id: 'statistics',
      title: 'Thống kê & Xu hướng',
      description: 'Biểu đồ phân tích sức khỏe',
      route: '/(tabs)/track/statistics',
      icon: <ChartIcon size={20} color="#FFF" />,
      color: '#F97316', // Cam
      disabled: true,
    },
    {
      id: 'history',
      title: 'Lịch sử đo',
      description: 'Xem lại dữ liệu quá khứ',
      route: '/(tabs)/track/history',
      icon: <CalendarIcon size={20} color="#FFF" />,
      color: '#3B82F6', // Xanh dương
      disabled: true,
    },
    {
      id: 'reports',
      title: 'Xuất báo cáo',
      description: 'Tạo file PDF gửi bác sĩ',
      route: '/(tabs)/track/reports',
      icon: <DocumentIcon size={20} color="#FFF" />,
      color: '#10B981', // Xanh lá
      disabled: true,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <ActivityIcon size={32} color="#FFF" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Theo dõi sức khỏe</Text>
          <Text style={styles.headerSubtitle}>Quản lý dữ liệu & Báo cáo</Text>
        </View>
      </View>

      {/* Menu Grid */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, item.disabled && styles.cardDisabled]}
            onPress={() => {
              if (!item.disabled) {
                router.push(item.route as any);
              }
            }}
            activeOpacity={item.disabled ? 1 : 0.7}
            disabled={item.disabled}
          >
            <View style={styles.cardContent}>
              {/* Icon Circle */}
              <View style={[styles.iconCircle, { backgroundColor: item.disabled ? '#94A3B8' : item.color }]}>
                {item.icon}
              </View>

              {/* Text Content */}
              <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, item.disabled && styles.textDisabled]}>
                    {item.title}
                  </Text>
                  {item.disabled && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Sắp ra mắt</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDescription}>
                  {item.description}
                </Text>
              </View>

              {/* Arrow */}
              {!item.disabled && (
                <View style={styles.arrowContainer}>
                  <ChevronRight size={24} color="#FFC9BE" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
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
  // Header Styles (Giống Profile/Home)
  header: {
    backgroundColor: '#FFAB9D',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  
  // Menu Container
  menuContainer: {
    gap: 16,
  },
  
  // Card Styles (Giống Profile)
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: {
    backgroundColor: '#FAFAFA', // Màu nền xám nhẹ khi disabled
    borderColor: '#E2E8F0',
    opacity: 0.8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  textDisabled: {
    color: '#94A3B8',
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});