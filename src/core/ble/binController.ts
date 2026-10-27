import { BleManager, Device as BleDevice } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import type { WasteType } from '../../shared/constants/waste';

/** UUID phải trùng với firmware ESP32. */
export const BIN_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BIN_COMMAND_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const BIN_STATUS_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export interface BinController {
  scan(timeoutMs?: number): Promise<BleDevice[]>;
  connect(deviceId: string): Promise<void>;
  openBin(type: WasteType): Promise<{ ok: boolean; message?: string }>;
  disconnect(): Promise<void>;
  /** Báo khi thiết bị tự rớt kết nối (ESP32 mất điện/khởi động lại). Trả về hàm huỷ đăng ký. */
  onDisconnected(listener: () => void): () => void;
}

class BleBinController implements BinController {
  private manager = new BleManager();
  private connected: BleDevice | null = null;
  private lastDeviceId: string | null = null;
  private listeners = new Set<() => void>();
  private manualDisconnect = false;

  onDisconnected(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async scan(timeoutMs = 5000) {
    const found = new Map<string, BleDevice>();
    this.manager.startDeviceScan([BIN_SERVICE_UUID], null, (error, device) => {
      if (error || !device) return;
      found.set(device.id, device);
    });
    await new Promise((r) => setTimeout(r, timeoutMs));
    this.manager.stopDeviceScan();
    return [...found.values()];
  }

  async connect(deviceId: string) {
    const device = await this.manager.connectToDevice(deviceId, { timeout: 8000 });
    await device.discoverAllServicesAndCharacteristics();
    this.connected = device;
    this.lastDeviceId = deviceId;
    this.manualDisconnect = false;

    // Thiết bị tự rớt (không phải do app chủ động ngắt) → xoá trạng thái và
    // báo cho tầng trên để nó tự kết nối lại.
    const sub = device.onDisconnected(() => {
      sub.remove();
      if (this.connected?.id === deviceId) this.connected = null;
      if (!this.manualDisconnect) this.listeners.forEach((l) => l());
    });
  }

  async openBin(type: WasteType) {
    // Vừa rớt kết nối mà chưa kịp tự nối lại → thử nối lại ngay một lần.
    if (!this.connected && this.lastDeviceId) {
      try {
        await this.connect(this.lastDeviceId);
      } catch {
        return { ok: false, message: 'Mất kết nối thùng rác, đang thử kết nối lại...' };
      }
    }
    if (!this.connected) return { ok: false, message: 'Chưa kết nối tới thùng rác' };
    const command = Buffer.from(JSON.stringify({ cmd: 'open', bin: type })).toString('base64');

    await this.connected.writeCharacteristicWithResponseForService(
      BIN_SERVICE_UUID,
      BIN_COMMAND_UUID,
      command,
    );

    const status = await this.connected.readCharacteristicForService(
      BIN_SERVICE_UUID,
      BIN_STATUS_UUID,
    );
    const raw = Buffer.from(status.value ?? '', 'base64').toString('utf8');
    try {
      const parsed = JSON.parse(raw) as { status: string; message?: string };
      return { ok: parsed.status === 'ok', message: parsed.message };
    } catch {
      return { ok: false, message: 'Thiết bị trả về dữ liệu không hợp lệ' };
    }
  }

  async disconnect() {
    this.manualDisconnect = true;
    if (this.connected) {
      const id = this.connected.id;
      this.connected = null;
      await this.manager.cancelDeviceConnection(id).catch(() => undefined);
    }
  }
}

/**
 * Bản giả lập dùng khi chưa có phần cứng hoặc khi demo trên máy không có BLE.
 * Bật bằng biến môi trường EXPO_PUBLIC_MOCK_BLE=1.
 */
class MockBinController implements BinController {
  async scan() {
    await delay(600);
    return [{ id: 'mock-bin-01', name: 'Thùng rác B1 (giả lập)' }] as unknown as BleDevice[];
  }
  async connect() {
    await delay(400);
  }
  async openBin(type: WasteType) {
    await delay(700);
    return { ok: true, message: `Đã mở ngăn ${type}` };
  }
  async disconnect() {}
  // Bản giả lập không bao giờ rớt kết nối.
  onDisconnected() {
    return () => undefined;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const binController: BinController =
  process.env.EXPO_PUBLIC_MOCK_BLE === '1' ? new MockBinController() : new BleBinController();
