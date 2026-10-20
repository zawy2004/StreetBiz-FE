import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/common';

import {
  cameraUnavailableMessage,
  SCAN_FRAME_SIZE,
  SCAN_INTERVAL_MS,
  SCAN_REARM_MS,
} from './qr-scan-support';

type Props = {
  /** Called once per distinct code; the caller decides when to stop scanning. */
  onDetected: (value: string) => void;
  paused?: boolean;
};

/** Live camera view that reports QR codes as they come into frame. */
export function QrScanner({ onDetected, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Held in refs so the capture loop never restarts when a prop changes -
  // restarting would tear the camera stream down mid-frame.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(cameraUnavailableMessage());
      return;
    }

    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let lastValue = '';
    let lastSeenAt = 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      const video = videoRef.current;
      if (disposed) return;
      if (!pausedRef.current && context && video && video.videoWidth > 0) {
        // Downscale: a 1080p frame costs several times more to decode and reads
        // no better than a 480px one at arm's length.
        const scale = Math.min(1, SCAN_FRAME_SIZE / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: 'dontInvert',
        });
        const now = Date.now();
        if (found?.data) {
          // The same code stays in frame for many reads; report it once.
          if (found.data !== lastValue) onDetectedRef.current(found.data);
          lastValue = found.data;
          lastSeenAt = now;
        } else if (lastValue && now - lastSeenAt > SCAN_REARM_MS) {
          // Once the code has left the frame, showing it again is a new
          // attempt - after "not ready yet" the seller marks the order ready
          // and holds the same phone up again, and that must be read.
          lastValue = '';
        }
      }
      timer = setTimeout(scan, SCAN_INTERVAL_MS);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scan();
      } catch {
        setError('Không mở được camera. Hãy cho phép quyền camera hoặc nhập mã bằng tay.');
      }
    })();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-sm bg-sunken p-lg text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-muted shadow-card">
          <Icon name="camera-plus-outline" size={28} color="currentColor" />
        </span>
        <p className="max-w-[34ch] text-[16px] font-medium leading-6 text-text">{error}</p>
      </div>
    );
  }

  // The frame, corners and scan line are drawn by the screen around this; the
  // video just fills it (no black box: before the camera starts the frame shows).
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      aria-hidden="true"
      className="h-full w-full object-cover"
    />
  );
}
