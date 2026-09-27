import { useCallback, useEffect, useRef, useState } from 'react';
import { runAtTargetFps, useFrameProcessor, type Frame } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import { DEFAULT_MODEL } from '../registry';
import { INPUT_SIZE } from '../preprocess';
import { classifyEmbedding, NONE, type ZeroShotResult } from '../zeroShot';

/** Số khung hình phân tích mỗi giây (model ~0,5 s/khung trên máy yếu). */
const TARGET_FPS = 2;
/** Điểm tối thiểu của một khung để tính là "thấy rác loại X". */
export const LIVE_THRESHOLD = 0.8;
/** Số khung liên tiếp phải cùng một loại mới mở nắp (~1,5 s ở 2 khung/giây). */
const STABLE_FRAMES = 3;
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
}

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
  const tflite = useTensorflowModel(DEFAULT_MODEL.asset);
  const model = tflite.state === 'loaded' ? tflite.model : undefined;
  const { resize } = useResizePlugin();

  const [status, setStatus] = useState<LiveStatus>({ phase: 'waiting', last: null, streak: 0, latencyMs: 0 });
  const streak = useRef<{ label: string | null; count: number; sum: number }>({ label: null, count: 0, sum: 0 });
  const cooldownUntil = useRef(0);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Chạy trên luồng JS: phân loại vector ảnh + logic "ổn định rồi mới mở nắp".
  const handleEmbedding = useCallback((embedding: number[], latencyMs: number) => {
    const result = classifyEmbedding(embedding);
    const now = Date.now();

    if (pausedRef.current || now < cooldownUntil.current) {
      streak.current = { label: null, count: 0, sum: 0 };
      setStatus({ phase: now < cooldownUntil.current ? 'cooldown' : 'waiting', last: result, streak: 0, latencyMs });
      return;
    }

    const isWaste = result.liveLabel !== NONE && result.liveConfidence >= LIVE_THRESHOLD;
    if (!isWaste) {
      streak.current = { label: null, count: 0, sum: 0 };
    } else if (streak.current.label === result.liveLabel) {
      streak.current.count += 1;
      streak.current.sum += result.liveConfidence;
    } else {
      streak.current = { label: result.liveLabel, count: 1, sum: result.liveConfidence };
    }

    if (streak.current.count >= STABLE_FRAMES && streak.current.label) {
      const { label, count, sum } = streak.current;
      streak.current = { label: null, count: 0, sum: 0 };
      cooldownUntil.current = now + COOLDOWN_MS;
      setStatus({ phase: 'cooldown', last: result, streak: STABLE_FRAMES, latencyMs });
      onDetectRef.current(label, sum / count);
      return;
    }

    setStatus({
      phase: streak.current.count > 0 ? 'detecting' : 'waiting',
      last: result,
      streak: streak.current.count,
      latencyMs,
    });
  }, []);

  const sendToJs = Worklets.createRunOnJS(handleEmbedding);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) return;
      runAtTargetFps(TARGET_FPS, () => {
        'worklet';
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
    stableFrames: STABLE_FRAMES,
  };
}
