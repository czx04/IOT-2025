import { API_URL } from './auth';

export type HealthData = {
  user_id: string;
  device_id: string;
  heart_rate: number;
  spo2: number;
};

const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://172.20.10.3:8080';

export function createWebSocketConnection(token: string, userId: string): WebSocket {
  const wsUrl = `${WS_BASE_URL}/ws/user/${userId}?t=${token}`;
  
  console.log('🔌 Connecting to WebSocket:', wsUrl.replace(/\?t=.*/, '?t=***'));
  
  return new WebSocket(wsUrl);
}

