import { Redirect } from 'expo-router';
import * as React from 'react';
import { ScrollView, View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { createWebSocketConnection, type HealthData } from '@/lib/websocket';

const CHART_WIDTH = Dimensions.get('window').width - 120; // Reduced from 80 to 120 for padding
const CHART_HEIGHT = 100; // Reduced from 120 to 100
const MAX_DATA_POINTS = 20;

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

// Heart Icon Component
function HeartIcon({ size = 24, color = '#FF9A8B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  );
}

// Line Chart Component with smooth transitions
function LineChart({ 
  data, 
  color, 
  minValue, 
  maxValue 
}: { 
  data: number[]; 
  color: string; 
  minValue: number; 
  maxValue: number; 
}) {
  const [smoothData, setSmoothData] = React.useState<number[]>(data);
  
  React.useEffect(() => {
    // Smooth transition between data points
    if (data.length > 0) {
      const lastValue = data[data.length - 1];
      const currentLastValue = smoothData[smoothData.length - 1];
      
      if (lastValue !== currentLastValue && smoothData.length === data.length - 1) {
        // Animate new data point
        let step = 0;
        const steps = 10;
        const interval = setInterval(() => {
          step++;
          const progress = step / steps;
          const interpolatedValue = currentLastValue + (lastValue - currentLastValue) * progress;
          
          setSmoothData(prev => {
            const newData = [...prev];
            if (newData.length === data.length - 1) {
              return [...newData, interpolatedValue];
            } else {
              newData[newData.length - 1] = interpolatedValue;
              return newData;
            }
          });
          
          if (step >= steps) {
            clearInterval(interval);
            setSmoothData(data);
          }
        }, 30);
        
        return () => clearInterval(interval);
      } else {
        setSmoothData(data);
      }
    }
  }, [data]);

  if (smoothData.length === 0) return null;

  // Add padding to prevent line from touching edges
  const padding = 5;
  const usableWidth = CHART_WIDTH - padding * 2;
  const usableHeight = CHART_HEIGHT - padding * 2;

  const points = smoothData.map((value, index) => {
    const x = padding + (index / Math.max(smoothData.length - 1, 1)) * usableWidth;
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    const y = padding + usableHeight - (normalizedValue * usableHeight);
    return `${x},${y}`;
  }).join(' ');

  // Create gradient path
  const gradientPath = points.split(' ').length > 0 
    ? `M ${points.split(' ')[0]} L ${points} L ${CHART_WIDTH - padding},${CHART_HEIGHT - padding} L ${padding},${CHART_HEIGHT - padding} Z`
    : '';

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          <Path
            d={`M ${padding} ${padding} L ${CHART_WIDTH - padding} ${padding} M ${padding} ${CHART_HEIGHT / 2} L ${CHART_WIDTH - padding} ${CHART_HEIGHT / 2} M ${padding} ${CHART_HEIGHT - padding} L ${CHART_WIDTH - padding} ${CHART_HEIGHT - padding}`}
            stroke="#FFC9BE"
            strokeWidth="1"
            opacity="0.3"
          />
          
          {/* Gradient fill under line */}
          {gradientPath && (
            <Path
              d={gradientPath}
              fill={color}
              opacity="0.1"
            />
          )}
          
          {/* Data line */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      
      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.axisLabel}>{maxValue}</Text>
        <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}</Text>
        <Text style={styles.axisLabel}>{minValue}</Text>
      </View>
    </View>
  );
}

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
  const { accessToken, user } = useAuth();
  const [healthData, setHealthData] = React.useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  
  // Store historical data for charts
  const [heartRateHistory, setHeartRateHistory] = React.useState<number[]>([]);
  const [spo2History, setSpo2History] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!accessToken || !user?.id) {
      return;
    }
    const ws = createWebSocketConnection(accessToken, user.id);

    ws.onopen = () => {
      console.log('WebSocket Connected!');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data: HealthData = JSON.parse(event.data);
        
        setHealthData(data);
        
        // Update chart history
        setHeartRateHistory(prev => {
          const newData = [...prev, data.heart_rate];
          return newData.slice(-MAX_DATA_POINTS);
        });
        
        setSpo2History(prev => {
          const newData = [...prev, data.spo2];
          return newData.slice(-MAX_DATA_POINTS);
        });
        
      } catch (err) {
        console.error('❌ Failed to parse WebSocket message:', err);
        setError('Lỗi khi nhận dữ liệu');
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Lỗi kết nối WebSocket - Kiểm tra server đang chạy');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    // Cleanup khi component unmount
    return () => {
      if (wsRef.current) {
        console.log('🧹 Cleaning up WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [accessToken, user?.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <HeartIcon size={40} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Theo dõi sức khỏe</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Đang kết nối' : 'Chưa kết nối'}
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Health Data Charts */}
        {healthData && heartRateHistory.length > 0 ? (
          <View style={styles.cardsContainer}>
            {/* Heart Rate Chart */}
            <View style={[styles.dataCard, styles.fullWidthCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <HeartIcon size={24} color="#FFF" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Nhịp tim</Text>
                  <View style={styles.currentValueRow}>
                    <Text style={styles.currentValue}>{healthData.heart_rate.toFixed(1)}</Text>
                    <Text style={styles.currentUnit}>bpm</Text>
                  </View>
                </View>
              </View>
              <LineChart 
                data={heartRateHistory}
                color="#FF9A8B"
                minValue={50}
                maxValue={120}
              />
            </View>

            {/* SpO2 Chart */}
            <View style={[styles.dataCard, styles.fullWidthCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>O₂</Text>
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Nồng độ oxy (SpO2)</Text>
                  <View style={styles.currentValueRow}>
                    <Text style={styles.currentValue}>{healthData.spo2.toFixed(1)}</Text>
                    <Text style={styles.currentUnit}>%</Text>
                  </View>
                </View>
              </View>
              <LineChart 
                data={spo2History}
                color="#3B82F6"
                minValue={90}
                maxValue={100}
              />
            </View>

            {/* Device Info Card */}
            <View style={[styles.dataCard, styles.fullWidthCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>📱</Text>
                </View>
                <Text style={styles.cardTitle}>Thông tin thiết bị</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device ID:</Text>
                <Text style={styles.infoValue}>{healthData.device_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>User ID:</Text>
                <Text style={styles.infoValue}>{healthData.user_id.substring(0, 8)}...</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF9A8B" />
            <Text style={styles.loadingText}>Đang chờ dữ liệu từ thiết bị...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    gap: 20,
  },
  header: {
    backgroundColor: '#FFAB9D',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#FFAB9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dataCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullWidthCard: {
    minWidth: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9A8B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dataUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#FFC9BE',
    paddingTop: 8,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF0EC',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 40,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    position: 'relative',
    marginTop: 16,
    paddingLeft: 40,
    overflow: 'hidden',
  },
  chartWrapper: {
    overflow: 'hidden',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  axisLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  currentValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  currentUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
