import { API_URL } from './auth';

export type HealthData = {
  hr: number;
  spo2: number;
  timestamp: string;
};

export function createWebSocketConnection(token: string): WebSocket {
  // Convert http:// to ws:// or https:// to wss://
  const wsUrl = API_URL.replace(/^http/, 'ws');
  const url = `${wsUrl}/ws/health?token=${encodeURIComponent(token)}`;
  
  return new WebSocket(url);
}

