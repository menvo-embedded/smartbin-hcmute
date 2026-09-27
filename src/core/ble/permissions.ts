import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android 12+ (API 31+) yêu cầu BLUETOOTH_SCAN/BLUETOOTH_CONNECT xin quyền lúc
 * chạy; bản thấp hơn cần ACCESS_FINE_LOCATION để quét BLE. iOS không cần bước
 * này (xin quyền qua Info.plist, hệ thống tự hỏi khi quét lần đầu).
 */
export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
