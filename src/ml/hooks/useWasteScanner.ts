import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { getClassifier } from '../registry';
import type { ModelSpec, Prediction } from '../classifier';

export type ScanSource = 'camera' | 'library';

export interface ScanResult extends Prediction {
  imageUri: string;
}

/**
 * Chụp / chọn ảnh rồi phân loại bằng MobileCLIP. Trả về kết quả dạng chung
 * (label + confidence + thông tin giải thích) để feature khác dùng, không
 * cần biết gì về TFLite.
 */
export function useWasteScanner(spec?: ModelSpec) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(
    async (source: ScanSource) => {
      setError(null);
      try {
        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) throw new Error('Cần quyền camera để quét rác.');
        }
        const picked =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        const asset = picked.canceled ? null : picked.assets[0];
        if (!asset) return null;

        setBusy(true);
        setResult(null);
        const prediction = await getClassifier(spec).classify(asset.uri, asset.width, asset.height);
        const scan = { ...prediction, imageUri: asset.uri };
        setResult(scan);
        return scan;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không phân loại được ảnh');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [spec],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { scan, result, busy, error, reset };
}
