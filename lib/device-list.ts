import { API_URL } from '@/lib/auth';

export type DeviceInfo = {
  id: string;
  deviceId: string;
  userId: string | null;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  registeredAt: string;
  lastSyncAt: string;
  isActive: boolean;
  batteryLevel: number;
};

export type DeviceListResponse = {
  err: string;
  body: DeviceInfo[];
  message: string;
};

export async function getDeviceList(token: string): Promise<DeviceInfo[]> {
  const response = await fetch(`${API_URL}/device`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const payload: DeviceListResponse = await response.json();
  if (!response.ok || payload.err) {
    throw new Error(payload.err || payload.message || 'Lỗi lấy danh sách thiết bị');
  }
  return payload.body;
}
