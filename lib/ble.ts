import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { decode as b64decode } from 'base-64';

// TODO: Replace these with your ESP32's custom Service & Characteristic UUIDs
export const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
export const CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

let _manager: BleManager | null = null;

function getManager(): BleManager {
  if (!_manager) {
    _manager = new BleManager();
  }
  return _manager;
}

export type DiscoveredDevice = Device;

export type ScanOptions = {
  namePrefix?: string; // filter by device name prefix (e.g. 'ESP32')
  onDevice: (device: Device) => void;
  onError?: (error: Error) => void;
};

/**
 * Start BLE scan for nearby devices. Call returned stop() to end scanning.
 */
export function scanForDevices(options: ScanOptions): () => void {
  const manager = getManager();
  let stopped = false;
  const seen = new Set<string>();
  let stateSub: Subscription | null = null;

  const startScan = () => {
    try {
      manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (stopped) return;
        if (error) {
          options.onError?.(error);
          return;
        }
        if (!device) return;
        if (device.id && seen.has(device.id)) return;
        if (options.namePrefix && device.name && !device.name.startsWith(options.namePrefix)) return;
        if (device.id) seen.add(device.id);
        options.onDevice(device);
      });
    } catch (err) {
      options.onError?.(err as Error);
    }
  };

  manager.state().then(state => {
    if (state === 'PoweredOn') {
      startScan();
    } else {
      stateSub = manager.onStateChange(newState => {
        if (newState === 'PoweredOn') {
          startScan();
          stateSub?.remove();
          stateSub = null;
        } else if (newState === 'Unauthorized' || newState === 'PoweredOff') {
          options.onError?.(new Error('Bluetooth not available: ' + newState));
        }
      }, true);
    }
  });

  return () => {
    stopped = true;
    if (stateSub) {
      stateSub.remove();
      stateSub = null;
    }
    manager.stopDeviceScan();
  };
}

/**
 * Connect to a device and write the userID to the specified characteristic.
 * The value is written as a base64 encoded JSON string: { userID: "..." }
 */
export async function connectAndFetchDeviceId(deviceId: string): Promise<{ success: boolean; deviceId?: string; error?: string; }>{
  const manager = getManager();
  try {
    const device = await manager.connectToDevice(deviceId, { timeout: 15000 });
    await device.discoverAllServicesAndCharacteristics();

    // Try reading characteristic once
    let value: string | null = null;
    try {
      const characteristic = await device.readCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID);
      value = characteristic?.value ?? null;
    } catch {}

    if (!value) {
      await new Promise<void>((resolve, reject) => {
        const sub = device.monitorCharacteristicForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          (error, c) => {
            if (error) {
              sub.remove();
              reject(error);
              return;
            }
            if (c?.value) {
              value = c.value;
              sub.remove();
              resolve();
            }
          }
        );
        // Timeout after 5s
        setTimeout(() => {
          if (!value) {
            sub.remove();
            resolve();
          }
        }, 5000);
      });
    }

    if (!value) {
      return { success: false, error: 'Không đọc được device_id BLE' };
    }
    // Base64 decode to raw string
    const decoded = b64decode(value).trim();
    return { success: true, deviceId: decoded };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Attempt to reconnect and resend user ID if needed.
 */
export async function reconnect(deviceId: string): Promise<boolean> {
  const result = await connectAndFetchDeviceId(deviceId);
  return result.success;
}

/** Cleanup BLE manager on demand */
export function destroyBleManager() {
  if (_manager) {
    _manager.destroy();
    _manager = null;
  }
}
