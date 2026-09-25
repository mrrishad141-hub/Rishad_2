import { useEffect, useState } from 'react';

const BOOT_SEQUENCE = [
  'TACTICAL COMMS TERMINAL v3.7.2',
  'Copyright (c) 2026 DEPT. OF DEFENSE',
  '',
  '> BIOS CHECK.................[OK]',
  '> MEMORY TEST...............[OK]',
  '> CRYPTO ENGINE INIT.........[OK]',
  '> AES-256-GCM MODULE.........[OK]',
  '> SECURE SOCKET LAYER........[OK]',
  '> KEY EXCHANGE PROTOCOL......[OK]',
  '> AUTH TOKEN VERIFY..........[OK]',
  '> DATABASE CONNECTION........[OK]',
  '> REALTIME SUBSCRIPTION......[OK]',
  '',
  '> LOADING TACTICAL MODULES...',
  '  [+] CHANNEL MANAGEMENT',
  '  [+] ENCRYPTED MESSAGING',
  '  [+] OPERATOR STATUS TRACKING',
  '  [+] SELF-DESTRUCT PROTOCOL',
  '',
  '> ESTABLISHING SECURE CHANNEL...',
  '> HANDSHAKE COMPLETE',
  '> ENCRYPTION: ACTIVE',
  '> STATUS: READY',
  '',
  'WELCOME, OPERATOR.',
];

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (visibleLines < BOOT_SEQUENCE.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 80 + Math.random() * 60);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((s) => !s);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <div className="pointer-events-none fixed inset-0 z-40 vignette" />

      <div className="relative z-10 w-full max-w-2xl p-8">
        <div className="space-y-0.5">
          {BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={`text-sm terminal-flicker ${
                line.startsWith('WELCOME')
                  ? 'text-green-300 font-bold text-lg mt-4'
                  : line.startsWith('TACTICAL') || line.startsWith('Copyright')
                    ? 'text-green-500 font-bold'
                    : 'text-green-400'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {line || '\u00A0'}
            </div>
          ))}
          {visibleLines >= BOOT_SEQUENCE.length && showCursor && (
            <div className="text-green-400 text-sm mt-2">&gt; _</div>
          )}
        </div>
      </div>
    </div>
  );
}
