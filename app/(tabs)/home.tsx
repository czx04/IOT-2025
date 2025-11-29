import { Redirect, useRouter } from 'expo-router'; // Thêm useRouter
import * as React from 'react';
import { ScrollView, View, StyleSheet, Dimensions, Animated, TouchableOpacity, Modal, Pressable } from 'react-native';
import Svg, { Path, Polyline, Line } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import { createWebSocketConnection, type HealthData } from '@/lib/websocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scanForDevices, connectAndFetchDeviceId, SERVICE_UUID, CHARACTERISTIC_UUID } from '@/lib/ble';
import { addDevice } from '@/lib/device';
import { updateWidgetData } from '@/lib/widget';

const CHART_WIDTH = Dimensions.get('window').width - 120;
const CHART_HEIGHT = 100;
const MAX_DATA_POINTS = 40;

// --- ICONS MỚI & CŨ ---
function HeartIcon({ size = 24, color = '#FF9A8B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  );
}
// ... (Giữ nguyên FlameIcon, ScaleIcon, PlayIcon, PauseIcon ở code cũ) ...
function FlameIcon({ size = 24, color = '#F97316' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </Svg>
  );
}
function ScaleIcon({ size = 24, color = '#10B981' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12,3c-4.97,0-9,4.03-9,9c0,4.97,4.03,9,9,9s9-4.03,9-9C21,7.03,16.97,3,12,3z M12,6c0.55,0,1,0.45,1,1s-0.45,1-1,1s-1-0.45-1-1S11.45,6,12,6z M12,18c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1S12.45,18,12,18z M14.3,13.7l-2.6,1.5C11.54,15.29,11.36,15.23,11.27,15.08l-1.5-2.6c-0.09-0.16-0.03-0.36,0.13-0.45l2.6-1.5c0.16-0.09,0.36-0.03,0.45,0.13l1.5,2.6C14.53,13.41,14.47,13.62,14.3,13.7z" />
    </Svg>
  );
}
function PlayIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function PauseIcon({ size = 24, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </Svg>
  );
}

// Icon Dấu cộng cho nút Thêm thiết bị
function PlusIcon({ size = 16, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

// ... (Giữ nguyên các hàm calculateAge, calculateBMI, LineChart...)
const calculateAge = (dateString?: string) => {
  if (!dateString) return 25;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const calculateCaloriesPerMinute = (hr: number, age: number, weight: number, gender: string) => {
  if (hr < 60) return 0;
  if (gender === 'male') {
    return (-55.0969 + 0.6309 * hr + 0.1988 * weight + 0.2017 * age) / 4.184;
  } else {
    return (-20.4022 + 0.4472 * hr + 0.1263 * weight + 0.074 * age) / 4.184;
  }
};

const getHeartRateZone = (hr: number, age: number) => {
  const maxHr = 220 - age;
  const percentage = (hr / maxHr) * 100;
  if (percentage < 50) return { label: 'Nghỉ ngơi', color: '#94A3B8' };
  if (percentage < 60) return { label: 'Khởi động', color: '#60A5FA' };
  if (percentage < 70) return { label: 'Đốt mỡ', color: '#34D399' };
  if (percentage < 80) return { label: 'Cardio', color: '#FBBF24' };
  if (percentage < 90) return { label: 'Bền bỉ', color: '#F97316' };
  return { label: 'Đỉnh điểm', color: '#EF4444' };
};

const calculateBMI = (heightCm: number, weightKg: number) => {
  if (!heightCm || !weightKg) return 0;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
};

function LineChart({ data, color, minValue, maxValue }: { data: number[]; color: string; minValue: number; maxValue: number }) {
  const [smoothData, setSmoothData] = React.useState<number[]>(data);
  React.useEffect(() => { if (data.length > 0) setSmoothData(data); }, [data]);
  if (smoothData.length === 0) return null;
  const padding = 5;
  const usableWidth = CHART_WIDTH - padding * 2;
  const usableHeight = CHART_HEIGHT - padding * 2;
  const points = smoothData.map((value, index) => {
    const x = padding + (index / Math.max(smoothData.length - 1, 1)) * usableWidth;
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    const y = padding + usableHeight - (normalizedValue * usableHeight);
    return `${x},${y}`;
  }).join(' ');
  const gradientPath = points.split(' ').length > 0 
    ? `M ${points.split(' ')[0]} L ${points} L ${CHART_WIDTH - padding},${CHART_HEIGHT - padding} L ${padding},${CHART_HEIGHT - padding} Z`
    : '';
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Path d={`M ${padding} ${padding} L ${CHART_WIDTH - padding} ${padding} M ${padding} ${CHART_HEIGHT / 2} L ${CHART_WIDTH - padding} ${CHART_HEIGHT / 2} M ${padding} ${CHART_HEIGHT - padding} L ${CHART_WIDTH - padding} ${CHART_HEIGHT - padding}`} stroke="#FFC9BE" strokeWidth="1" opacity="0.3" />
          {gradientPath && <Path d={gradientPath} fill={color} opacity="0.1" />}
          <Polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={styles.yAxisLabels}>
        <Text style={styles.axisLabel}>{maxValue}</Text>
        <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}</Text>
        <Text style={styles.axisLabel}>{minValue}</Text>
      </View>
    </View>
  );
}

// --- MAIN SCREEN ---
export default function HomeScreen() {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
  if (!isAuthenticated) return <Redirect href="/login" />;
  return <AuthorizedHome />;
}

function AuthorizedHome() {
  const router = useRouter(); // Khai báo Router
  const { accessToken, user } = useAuth();
  const [healthData, setHealthData] = React.useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  
  const [heartRateHistory, setHeartRateHistory] = React.useState<number[]>([]);
  const [spo2History, setSpo2History] = React.useState<number[]>([]);

  const [caloriesBurned, setCaloriesBurned] = React.useState(0);
  const [isTracking, setIsTracking] = React.useState(false);
  const isTrackingRef = React.useRef(false); 
  const lastUpdateTime = React.useRef(Date.now());

  const age = React.useMemo(() => calculateAge(user?.date_of_birth), [user?.date_of_birth]);
  const weight = user?.weight || 60;
  const height = user?.height || 170;
  const gender = (user?.gender as string) || 'male';
  const bmi = React.useMemo(() => calculateBMI(height, weight), [height, weight]);

  const toggleTracking = () => {
    const newState = !isTracking;
    setIsTracking(newState);
    isTrackingRef.current = newState; 
    if (newState) {
      lastUpdateTime.current = Date.now();
      // setCaloriesBurned(0); // Reset nếu muốn
    }
  };

  // BLE State
  const [isScanModalVisible, setIsScanModalVisible] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const [bleDevices, setBleDevices] = React.useState<Record<string, { id: string; name: string | null }>>({});
  const [selectedBleDeviceId, setSelectedBleDeviceId] = React.useState<string | null>(null);
  const stopScanRef = React.useRef<(() => void) | null>(null);
  const BLE_STORAGE_KEY = '@iot-app/ble-device-id';

  const openScanModal = () => {
    setIsScanModalVisible(true);
    startScan();
  };

  const closeScanModal = () => {
    stopScan();
    setIsScanModalVisible(false);
  };

  const startScan = () => {
    if (isScanning) return;
    setBleDevices({});
    setIsScanning(true);
    stopScanRef.current = scanForDevices({
      namePrefix: 'ESP', // Adjust if needed for your ESP32 advertised name
      onDevice: (device) => {
        setBleDevices(prev => prev[device.id] ? prev : { ...prev, [device.id]: { id: device.id, name: device.name ?? 'Thiết bị không tên' } });
      },
      onError: (err) => {
        console.error('[BLE] Scan error:', err);
        setIsScanning(false);
      }
    });
    // Auto-stop after 20s
    setTimeout(() => stopScan(), 20000);
  };

  const stopScan = () => {
    if (stopScanRef.current) {
      stopScanRef.current();
      stopScanRef.current = null;
    }
    setIsScanning(false);
  };

  const selectDevice = async (deviceId: string) => {
    stopScan();
    try {
      const result = await connectAndFetchDeviceId(deviceId);
      if (!result.success || !result.deviceId) {
        alert('Không lấy được deviceId: ' + (result.error || 'Unknown'));
        return;
      }
      const actualId = result.deviceId;
      setSelectedBleDeviceId(actualId);
      await AsyncStorage.setItem(BLE_STORAGE_KEY, actualId);
      // Register device with backend (no longer sending userID via BLE)
      if (accessToken) {
        try {
          await addDevice(accessToken, actualId);
          alert('Thiết bị đã được đăng ký: ' + actualId);
        } catch (e) {
          alert('Đăng ký thiết bị thất bại: ' + (e as Error).message);
        }
      }
      setIsScanModalVisible(false);
    } catch (err) {
      alert('Lỗi khi kết nối thiết bị: ' + (err as Error).message);
    }
  };

  // Auto-reconnect on load if stored device exists
  React.useEffect(() => {
    (async () => {
      const storedId = await AsyncStorage.getItem(BLE_STORAGE_KEY);
      if (storedId) {
        setSelectedBleDeviceId(storedId);
        // Attempt silent reconnect (just to ensure characteristic available); no alert.
        const r = await connectAndFetchDeviceId(storedId);
        if (!r.success) {
          console.log('[BLE] Auto reconnect read failed:', r.error);
        }
      }
    })();
  }, []);

  // Update widget data when user enters the home screen
  React.useEffect(() => {
    if (user) {
      updateWidgetData(user).catch(err => 
        console.error('[Home] Failed to update widget data:', err)
      );
    }
  }, [user]);

  React.useEffect(() => {
    if (!accessToken || !user?.id) return;
    const ws = createWebSocketConnection(accessToken, user.id);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    // Tìm đến đoạn ws.onmessage trong useEffect (khoảng dòng 345) và thay thế bằng code này:

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    console.log('WS Message:', message);

    const raw = message.data || {}; 

    const normalized: HealthData = {
      device_id: raw.device_id ?? raw.deviceId ?? '',
      
      // Lấy heart_rate (số nguyên hoặc float đều là number trong JS)
      heart_rate: typeof raw.heart_rate === 'number' ? raw.heart_rate : (typeof raw.hr === 'number' ? raw.hr : 0),
      
      // Lấy SpO2 (Float)
      spo2: typeof raw.spo2 === 'number' ? raw.spo2 : (typeof raw.SpO2 === 'number' ? raw.SpO2 : 0),
      timestamp: raw.timestamp,
    };
  
    console.log('Normalized data:', normalized);

    // --- Logic cập nhật state bên dưới giữ nguyên ---
    const now = Date.now();
    setHealthData(normalized);
    
    if (typeof normalized.heart_rate === 'number' && normalized.heart_rate > 0) {
      setHeartRateHistory(prev => [...prev, normalized.heart_rate].slice(-MAX_DATA_POINTS));
    }
    if (typeof normalized.spo2 === 'number' && normalized.spo2 > 0) {
      setSpo2History(prev => [...prev, normalized.spo2].slice(-MAX_DATA_POINTS));
    }

    if (isTrackingRef.current && normalized.heart_rate > 0) {
      const timeDiffMinutes = (now - lastUpdateTime.current) / 1000 / 60;
      if (timeDiffMinutes > 0 && timeDiffMinutes < 5) {
        const cpm = calculateCaloriesPerMinute(normalized.heart_rate, age, weight, gender);
        setCaloriesBurned(prev => prev + (cpm * timeDiffMinutes));
      }
    }
    lastUpdateTime.current = now;
  } catch (err) {
    console.error('WebSocket Parse Error:', err);
  }
};

    ws.onerror = () => {
      setError('Lỗi kết nối');
      setIsConnected(false);
    };

    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;
    return () => wsRef.current?.close();
  }, [accessToken, user?.id, age, weight, gender]);

  const currentHR = healthData?.heart_rate || 0;
  const currentZone = getHeartRateZone(currentHR, age);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        
        {/* === HEADER CHÍNH ĐÃ SỬA === */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <HeartIcon size={40} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Chào, {user?.name || 'Bạn'}!</Text>

          {/* Wrapper chứa các thẻ thông tin nằm ngang */}
          <View style={styles.headerInfoRow}>
            
            {/* 1. Trạng thái kết nối (Luôn hiện) */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isConnected ? styles.statusDotConnected : styles.statusDotDisconnected]} />
              <Text style={styles.statusText}>
                {isConnected ? 'Đang nhận' : 'Mất kết nối'}
              </Text>
            </View>

            {/* 2. Logic hiển thị: Nếu có thiết bị -> Hiện ID, Nếu không -> Hiện nút Thêm */}
            {selectedBleDeviceId ? (
              <View style={styles.deviceTag}>
                <Text style={styles.deviceLabel}>BLE:</Text>
                <Text style={styles.deviceName}>{selectedBleDeviceId.slice(0, 8)}...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addDeviceButton} 
                onPress={openScanModal}
              >
                <PlusIcon size={14} color="#FFF" />
                <Text style={styles.addDeviceText}>{isScanning ? 'Đang dò...' : 'Thêm thiết bị'}</Text>
              </TouchableOpacity>
            )}
      {/* BLE Scan Modal */}
      <Modal visible={isScanModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chọn thiết bị ESP32</Text>
            <Text style={styles.modalSubtitle}>Dò: {isScanning ? 'Đang chạy' : 'Đã dừng'}</Text>
            <ScrollView style={{ maxHeight: 240, marginTop: 8 }}>
              {Object.values(bleDevices).length === 0 && (
                <Text style={styles.emptyText}>Chưa tìm thấy thiết bị...</Text>
              )}
              {Object.values(bleDevices).map(d => (
                <Pressable key={d.id} style={styles.deviceRow} onPress={() => selectDevice(d.id)}>
                  <Text style={styles.deviceRowName}>{d.name ?? 'Không tên'}</Text>
                  <Text style={styles.deviceRowId}>{d.id.slice(0, 10)}...</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={closeScanModal}>
                <Text style={styles.modalBtnText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, isScanning ? styles.modalBtnDisabled : styles.modalBtnPrimary]}
                disabled={isScanning}
                onPress={startScan}
              >
                <Text style={styles.modalBtnText}>{isScanning ? 'Đang dò' : 'Dò lại'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>UUID Service: {SERVICE_UUID.slice(0, 8)}...\nUUID Char: {CHARACTERISTIC_UUID.slice(0, 8)}...</Text>
          </View>
        </View>
      </Modal>

          </View>
        </View>
        {/* === KẾT THÚC HEADER === */}

        {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}

        {healthData ? (
          // --- KHI CÓ DỮ LIỆU ---
          <View style={styles.cardsContainer}>
            {/* Nhịp tim */}
            <View style={[styles.dataCard, styles.fullWidthCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}><HeartIcon size={24} color="#FFF" /></View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Nhịp tim</Text>
                  <View style={styles.currentValueRow}>
                    <Text style={styles.currentValue}>{(typeof healthData?.heart_rate === 'number' ? healthData.heart_rate : 0).toFixed(0)}</Text>
                    <Text style={styles.currentUnit}>bpm</Text>
                    <View style={[styles.zoneBadge, { backgroundColor: currentZone.color + '20' }]}>
                      <Text style={[styles.zoneText, { color: currentZone.color }]}>{currentZone.label}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <LineChart data={heartRateHistory} color="#FF9A8B" minValue={40} maxValue={140} />
            </View>

            {/* Calo & BMI */}
            <View style={styles.rowContainer}>
              <View style={[styles.dataCard, styles.halfCard]}>
                <View style={styles.cardHeaderSmall}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F97316' }]}>
                    <FlameIcon size={20} color="#FFF" />
                  </View>
                  <TouchableOpacity 
                    style={[styles.miniButton, isTracking ? styles.miniButtonActive : styles.miniButtonInactive]}
                    onPress={toggleTracking}
                  >
                    {isTracking ? <PauseIcon size={16} color="#FFF"/> : <PlayIcon size={16} color="#FFF"/>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitleSmall}>Calo tiêu thụ</Text>
                <View style={styles.currentValueRow}>
                  <Text style={[styles.currentValue, {fontSize: 28}]}>{caloriesBurned.toFixed(0)}</Text>
                  <Text style={styles.currentUnit}>kcal</Text>
                </View>
                <Text style={[styles.cardSubtext, { color: isTracking ? '#10B981' : '#94A3B8' }]}>
                  {isTracking ? '● Đang đo...' : 'Đã tạm dừng'}
                </Text>
              </View>

              <View style={[styles.dataCard, styles.halfCard]}>
                <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
                  <ScaleIcon size={20} color="#FFF" />
                </View>
                <Text style={styles.cardTitleSmall}>Chỉ số BMI</Text>
                <View style={styles.currentValueRow}>
                  <Text style={[styles.currentValue, {fontSize: 28}]}>{bmi}</Text>
                </View>
                <Text style={styles.cardSubtext}>
                  {bmi < 18.5 ? 'Thiếu cân' : bmi < 25 ? 'Bình thường' : 'Thừa cân'}
                </Text>
              </View>
            </View>

            {/* SpO2 */}
            <View style={[styles.dataCard, styles.fullWidthCard]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}><Text style={styles.iconText}>O₂</Text></View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Nồng độ oxy (SpO2)</Text>
                  <View style={styles.currentValueRow}>
                    <Text style={styles.currentValue}>{(typeof healthData?.spo2 === 'number' ? healthData.spo2 : 0).toFixed(0)}</Text>
                    <Text style={styles.currentUnit}>%</Text>
                  </View>
                </View>
              </View>
              <LineChart data={spo2History} color="#3B82F6" minValue={90} maxValue={100} />
            </View>
          </View>
        ) : (
          // --- KHI CHƯA CÓ DỮ LIỆU (MÀN HÌNH CHỜ) ---
          <View style={styles.loadingCard}>
            {isConnected ? (
              <>
                <ActivityIndicator size="large" color="#FF9A8B" />
                <Text style={styles.loadingText}>Đang chờ dữ liệu từ thiết bị...</Text>
                <Text style={styles.loadingSubText}>Hãy đeo thiết bị và giữ kết nối</Text>
              </>
            ) : (
              <>
                <View style={[styles.iconCircle, {backgroundColor: '#F1F5F9', marginBottom: 12}]}>
                  <HeartIcon size={32} color="#94A3B8" />
                </View>
                <Text style={styles.loadingText}>Chưa kết nối thiết bị</Text>
                <TouchableOpacity style={styles.mainAddButton} onPress={openScanModal}>
                  <Text style={styles.mainAddButtonText}>Kết nối thiết bị ngay</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F6' },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  content: { gap: 20 },
  
  // HEADER STYLES (ĐÃ SỬA)
  header: { backgroundColor: '#FFAB9D', borderRadius: 24, padding: 24, alignItems: 'center' },
  headerIcon: { marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  
  // Container xếp ngang các thông tin
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  // Trạng thái (Xanh/Đỏ)
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotConnected: { backgroundColor: '#10B981' },
  statusDotDisconnected: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 13, color: '#FFF', fontWeight: '600' },

  // Thẻ thiết bị (ID)
  deviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)', // Màu tối hơn chút để nổi bật trên nền hồng
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deviceLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', marginRight: 4, fontWeight: '500' },
  deviceName: { fontSize: 12, color: '#FFF', fontWeight: '700' },

  // Nút Thêm thiết bị trên Header
  addDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed', // Viền nét đứt
  },
  addDeviceText: { fontSize: 13, color: '#FFF', fontWeight: '600' },

  // ... Các style khác ...
  errorCard: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 16, padding: 16 },
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center', fontWeight: '600' },
  cardsContainer: { gap: 16 },
  rowContainer: { flexDirection: 'row', gap: 16 },
  dataCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#FFC9BE' },
  fullWidthCard: { width: '100%' },
  halfCard: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF9A8B', justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18, color: '#FFF', fontWeight: '700' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  cardTitleSmall: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 4, marginBottom: 4 },
  currentValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  
  currentValue: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#1A1A1A',
    lineHeight: 40,
    paddingTop: 4,
  },
  
  currentUnit: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  zoneBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, transform: [{translateY: -4}] },
  zoneText: { fontSize: 12, fontWeight: '700' },
  cardSubtext: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 4 },
  
  // Loading Card (Màn hình chờ)
  loadingCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 40, borderWidth: 2, borderColor: '#FFC9BE', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600', textAlign: 'center' },
  loadingSubText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  
  mainAddButton: {
    marginTop: 8,
    backgroundColor: '#FF9A8B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  mainAddButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  chartContainer: { marginTop: 8, height: CHART_HEIGHT, paddingLeft: 30 },
  chartWrapper: { flex: 1, overflow: 'hidden' },
  yAxisLabels: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'space-between', paddingVertical: 5 },
  axisLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  miniButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  miniButtonActive: { backgroundColor: '#EF4444' },
  miniButtonInactive: { backgroundColor: '#10B981' },

  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '86%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#FFC9BE' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  deviceRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  deviceRowName: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  deviceRowId: { fontSize: 12, color: '#64748B' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: '#FF9A8B' },
  modalBtnSecondary: { backgroundColor: '#FFE4E1' },
  modalBtnDisabled: { backgroundColor: '#FECACA' },
  modalBtnText: { color: '#1A1A1A', fontWeight: '700' },
  hintText: { marginTop: 8, fontSize: 10, color: '#64748B' }
});