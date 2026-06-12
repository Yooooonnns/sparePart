import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

interface Props {
  onDetected: (value: string) => void;
  onCancel: () => void;
}

function isSecureCtx() {
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export function QRScanner({ onDetected, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const cleanupRef = useRef<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [useHtml5, setUseHtml5] = useState(false);

  const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!started) return;
    if (!isSecureCtx()) { setError('HTTPS_REQUIRED'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera unavailable in this browser.'); return; }

    let mounted = true;
    let animId = 0;
    let stream: MediaStream | null = null;
    let detected = false;
    let triedNative = false;

    function stopStream() {
      cancelAnimationFrame(animId);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function runHtml5Fallback() {
      setUseHtml5(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 200)));
      if (!mounted) return;
      const boxSize = Math.round(Math.min(window.innerWidth * 0.72, 290));
      const scanner = new Html5Qrcode('qr-placeholder', { verbose: false });
      let stopped = false;
      const safeStop = () => {
        if (stopped) return Promise.resolve();
        stopped = true;
        return scanner.stop().catch(() => {});
      };
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: boxSize, height: boxSize } },
        (decoded) => { if (detected) return; detected = true; void safeStop().then(() => onDetectedRef.current(decoded)); },
        undefined,
      );
      if (!mounted) { void safeStop(); return; }
      setReady(true);
      cleanupRef.current = () => { void safeStop(); };
    }

    async function run() {
      try {
        if (hasNativeDetector && !useHtml5) {
          triedNative = true;
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
          if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
          stream.getTracks().forEach((t) => { t.onended = () => { if (!mounted || detected) return; setError('Camera stopped.'); stopStream(); }; });
          if (videoRef.current) {
            const vid = videoRef.current;
            vid.srcObject = stream;
            await vid.play().catch(() => {});
            if (!mounted) { stopStream(); return; }
            await new Promise<void>((res) => {
              if (!vid.paused && vid.readyState >= 3) { res(); return; }
              vid.addEventListener('playing', () => res(), { once: true });
              setTimeout(res, 5000);
            });
          }
          if (!mounted) return;
          setReady(true);
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          cleanupRef.current = stopStream;
          const tick = async () => {
            if (!mounted || detected || !videoRef.current) return;
            if (videoRef.current.readyState >= 3 && !videoRef.current.paused) {
              const codes = await detector.detect(videoRef.current).catch(() => [] as { rawValue: string }[]);
              if (codes.length > 0) { detected = true; stopStream(); onDetectedRef.current(codes[0].rawValue); return; }
            }
            animId = requestAnimationFrame(tick);
          };
          animId = requestAnimationFrame(tick);
        } else {
          await runHtml5Fallback();
        }
      } catch (err) {
        if (!mounted) return;
        const msg = (err as Error).message ?? '';
        if (triedNative && /BarcodeDetector|NotSupported|not supported|qr_code|format|detect/i.test(msg)) {
          stopStream(); setReady(false); setError(null); await runHtml5Fallback(); return;
        }
        if (/Permission|denied|NotAllowed|not allowed/i.test(msg)) setError('Camera permission denied. Check browser settings.');
        else if (/Busy|busy|Constraint|NotFound/i.test(msg)) setError('Camera is busy or not found.');
        else setError('Camera error: ' + msg);
      }
    }

    void run();
    return () => { mounted = false; cleanupRef.current?.(); cleanupRef.current = null; };
  }, [started, useHtml5]);

  function retry() { cleanupRef.current?.(); setError(null); setReady(false); setUseHtml5(false); setStarted(false); }

  if (error === 'HTTPS_REQUIRED') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center bg-gray-950">
        <Camera size={48} className="text-gray-400" strokeWidth={1.5} />
        <p className="text-white font-semibold">HTTPS required for camera</p>
        <button onClick={onCancel} className="text-gray-400 text-sm mt-2">Go Back</button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center bg-gray-950">
        <Camera size={48} className="text-gray-400" strokeWidth={1.5} />
        <p className="text-white text-sm leading-relaxed">{error}</p>
        <button onClick={retry} className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-2xl text-sm">Try Again</button>
        <button onClick={onCancel} className="text-gray-400 text-sm">Go Back</button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center bg-gray-950">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Camera size={40} className="text-white" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-white text-lg font-semibold mb-1">Scan QR Code</p>
          <p className="text-gray-400 text-sm">Point the camera at the QR sticker on the post</p>
        </div>
        <button onClick={() => setStarted(true)} className="bg-white text-black font-bold px-10 py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-transform">
          Start Camera
        </button>
        <button onClick={onCancel} className="text-gray-500 text-sm">Cancel</button>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-black overflow-hidden min-h-0">
      <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${useHtml5 ? 'hidden' : 'block'}`} />
      <div id="qr-placeholder" className={useHtml5 ? 'absolute inset-0 overflow-hidden' : 'hidden'} />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="w-9 h-9 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Starting camera...</p>
        </div>
      )}
      {ready && !useHtml5 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white rounded-2xl opacity-70 w-[min(72vw,280px)] h-[min(72vw,280px)]" />
        </div>
      )}
    </div>
  );
}
