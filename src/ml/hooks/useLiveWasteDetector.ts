import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { runAtTargetFps, useFrameProcessor, type Frame } from 'react-native-vision-camera';
import { useTensorflowModel, type TensorflowModelDelegate } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import { DEFAULT_MODEL } from '../registry';
import { INPUT_SIZE } from '../preprocess';
import { classifyEmbedding, NONE, type ZeroShotResult } from '../zeroShot';

/**
 * Số khung hình đưa vào model mỗi giây. Model mất ~0,5 s/khung (TECNO CM6, GPU);
 * chạy dày hơn sẽ chiếm hết máy và làm hình xem trước giật.
 */
const TARGET_FPS = 2;
/** Điểm tối thiểu của một khung để tính là "thấy rác loại X". */
export const LIVE_THRESHOLD = 0.8;
/** Số khung liên tiếp phải cùng một loại mới mở nắp (~1 s ở 2 khung/giây). */
const STABLE_FRAMES = 2;
/** Nghỉ sau khi mở nắp, tránh mở lặp khi rác còn trước camera. */
const COOLDOWN_MS = 5_000;

export interface LiveStatus {
  /** 'waiting' = chưa thấy rác, 'detecting' = đang xác nhận, 'cooldown' = vừa mở nắp. */
  phase: 'waiting' | 'detecting' | 'cooldown';
  /** Kết quả của khung gần nhất. */
  last: ZeroShotResult | null;
  /** Số khung liên tiếp đã khớp (0..STABLE_FRAMES). */
  streak: number;
  latencyMs: number;
  /** Đang chạy model bằng GPU hay CPU. */
  delegate: 'gpu' | 'cpu';
}

/** Android thử GPU trước (nhanh hơn nhiều lần); lỗi hoặc ra NaN thì về CPU. */
const FIRST_DELEGATE: TensorflowModelDelegate = Platform.OS === 'android' ? 'android-gpu' : 'default';

/** Góc xoay khung hình của cảm biến về đúng chiều điện thoại. */
function rotationFor(orientation: Frame['orientation']) {
  'worklet';
  switch (orientation) {
    case 'landscape-left':
      return '90deg' as const;
    case 'landscape-right':
      return '270deg' as const;
    case 'portrait-upside-down':
      return '180deg' as const;
    default:
      return '0deg' as const;
  }
}

/**
 * Nhận diện rác trực tiếp từ camera: không cần chụp, đưa rác ra trước camera
 * là tự nhận diện. Khi STABLE_FRAMES khung liên tiếp cùng ra một loại rác với
 * điểm ≥ LIVE_THRESHOLD (nhóm "không có rác" không tính) thì gọi onDetect một
 * lần, rồi nghỉ COOLDOWN_MS.
 */
export function useLiveWasteDetector(onDetect: (label: string, confidence: number) => void, paused = false) {
  const [delegate, setDelegate] = useState<TensorflowModelDelegate>(FIRST_DELEGATE);
  const tflite = useTensorflowModel(DEFAULT_MODEL.asset, delegate);
  const model = tflite.state === 'loaded' ? tflite.model : undefined;
  const usingGpu = delegate !== 'default';

  // Máy không hỗ trợ GPU delegate → nạp lại bằng CPU.
  useEffect(() => {
    if (tflite.state === 'error' && usingGpu) setDelegate('default');
  }, [tflite.state, usingGpu]);
  const { resize } = useResizePlugin();

  const [status, setStatus] = useState<LiveStatus>({
    phase: 'waiting',
    last: null,
    streak: 0,
    latencyMs: 0,
    delegate: 'cpu',
  });
  const streak = useRef<{ label: string | null; count: number; sum: number }>({
    label: null,
    count: 0,
    sum: 0,
  });
  const cooldownUntil = useRef(0);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Chạy trên luồng JS: phân loại vector ảnh + logic "ổn định rồi mới mở nắp".
  const handleEmbedding = useCallback(
    (embedding: number[], latencyMs: number) => {
      // GPU thường tính ở FP16 → có thể tràn số ra NaN (giống bản FP16) → về CPU.
      if (!Number.isFinite(embedding[0])) {
        setDelegate('default');
        return;
      }
      const dlg = usingGpu ? 'gpu' : 'cpu';
      const result = classifyEmbedding(embedding);
      const now = Date.now();

      if (pausedRef.current || now < cooldownUntil.current) {
        streak.current = { label: null, count: 0, sum: 0 };
        setStatus({
          phase: now < cooldownUntil.current ? 'cooldown' : 'waiting',
          last: result,
          streak: 0,
          latencyMs,
          delegate: dlg,
        });
        return;
      }

      const isWaste = result.liveLabel !== NONE && result.liveConfidence >= LIVE_THRESHOLD;
      if (!isWaste) {
        streak.current = { label: null, count: 0, sum: 0 };
      } else if (streak.current.label === result.liveLabel) {
        streak.current.count += 1;
        streak.current.sum += result.liveConfidence;
      } else {
        streak.current = {
          label: result.liveLabel,
          count: 1,
          sum: result.liveConfidence,
        };
      }

      if (streak.current.count >= STABLE_FRAMES && streak.current.label) {
        const { label, count, sum } = streak.current;
        streak.current = { label: null, count: 0, sum: 0 };
        cooldownUntil.current = now + COOLDOWN_MS;
        setStatus({
          phase: 'cooldown',
          last: result,
          streak: STABLE_FRAMES,
          latencyMs,
          delegate: dlg,
        });
        onDetectRef.current(label, sum / count);
        return;
      }

      setStatus({
        phase: streak.current.count > 0 ? 'detecting' : 'waiting',
        last: result,
        streak: streak.current.count,
        latencyMs,
        delegate: dlg,
      });
    },
    [usingGpu],
  );

  const sendToJs = Worklets.createRunOnJS(handleEmbedding);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) return;
      runAtTargetFps(TARGET_FPS, () => {
        'worklet';
        // Chạy đồng bộ trong frame processor: bộ đệm của resize plugin chỉ hợp
        // lệ trong khung hình hiện tại — đưa sang runAsync làm crash (SIGSEGV
        // trong TensorflowPlugin::copyInputBuffers). Khung đến khi model còn
        // bận sẽ bị camera bỏ qua, hình xem trước vẫn chạy độc lập.
        const start = performance.now();
        // Cắt giữa, thu về 256×256, RGB float [0,1] — đúng đầu vào của MobileCLIP.
        const input = resize(frame, {
          scale: { width: INPUT_SIZE, height: INPUT_SIZE },
          rotation: rotationFor(frame.orientation),
          pixelFormat: 'rgb',
          dataType: 'float32',
        });
        // Không dùng destructuring/Array.from trong worklet: Babel biến chúng
        // thành hàm phụ (_slicedToArray) không chạy được trên luồng camera.
        const outputs = model.runSync([input]);
        const embedding = outputs[0] as Float32Array;
        const values: number[] = [];
        for (let i = 0; i < embedding.length; i++) values.push(embedding[i]);
        sendToJs(values, performance.now() - start);
      });
    },
    [model, resize, sendToJs],
  );

  // Rời màn hình / tạm dừng thì bỏ dở chuỗi đang xác nhận.
  useEffect(() => {
    if (paused) streak.current = { label: null, count: 0, sum: 0 };
  }, [paused]);

  return {
    frameProcessor,
    status,
    modelState: tflite.state,
    delegate: usingGpu ? ('gpu' as const) : ('cpu' as const),
    stableFrames: STABLE_FRAMES,
  };
}
