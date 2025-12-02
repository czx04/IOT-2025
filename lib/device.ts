import { API_URL } from '@/lib/auth';

export async function addDevice(token: string, deviceId: string): Promise<void> {
  const response = await fetch(`${API_URL}/device/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ device_id: deviceId }),
  });

  const payload = await response.json();
  if (!response.ok || payload.err) {
    let message = 'Unable to link device.';
    if (payload?.body?.message) message = payload.body.message;
    else if (payload?.message) message = payload.message;
    else if (payload?.err) message = payload.err;
    throw new Error(message);
  }
}

export async function unlinkDevice(token: string, deviceId: string): Promise<void> {
  const response = await fetch(`${API_URL}/device/link`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ device_id: deviceId }),
  });

  const payload = await response.json();
  if (!response.ok || payload.err) {
    let message = 'Unable to unlink device.';
    if (payload?.body?.message) message = payload.body.message;
    else if (payload?.message) message = payload.message;
    else if (payload?.err) message = payload.err;
    throw new Error(message);
  }
}
