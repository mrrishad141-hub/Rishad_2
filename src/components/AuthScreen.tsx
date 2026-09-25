import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Shield, Lock, Radio, AlertTriangle, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [callSign, setCallSign] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Boot line animation
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    const lines = [
      '> INITIALIZING TACTICAL COMMS TERMINAL...',
      '> LOADING CRYPTO MODULES... [OK]',
      '> ESTABLISHING SECURE CHANNEL... [OK]',
      '> AES-256-GCM ENCRYPTION: ACTIVE',
      '> AUTHENTICATION REQUIRED',
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
        setBootDone(true);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!callSign.trim()) {
        setError('CALL SIGN REQUIRED');
        setLoading(false);
        return;
      }
      if (callSign.length < 3) {
        setError('CALL SIGN MUST BE AT LEAST 3 CHARACTERS');
        setLoading(false);
        return;
      }
    }

    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, callSign);

    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono relative overflow-hidden">
      {/* Scan lines overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-40 vignette" />

      <div className="relative z-10 w-full max-w-md p-8">
        {/* Boot lines */}
        <div className="mb-8 space-y-1">
          {bootLines.map((line, i) => (
            <div
              key={i}
              className="text-green-400 text-xs terminal-flicker"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div
          className={`border border-green-500/30 bg-green-950/5 p-8 transition-opacity duration-500 ${
            bootDone ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Corner brackets */}
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-green-400 text-lg font-bold tracking-widest">TACTICAL COMMS</h1>
              <p className="text-green-600 text-xs tracking-wider">SECURE ENCRYPTED TERMINAL</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex mb-6 border border-green-500/20">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-xs tracking-widest transition-colors ${
                mode === 'signin'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-green-700 hover:text-green-500'
              }`}
            >
              [ SIGN IN ]
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs tracking-widest transition-colors ${
                mode === 'signup'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-green-700 hover:text-green-500'
              }`}
            >
              [ REGISTER ]
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-green-600 text-xs tracking-widest mb-1">
                  CALL SIGN
                </label>
                <input
                  type="text"
                  value={callSign}
                  onChange={(e) => setCallSign(e.target.value)}
                  placeholder="E.G. GHOST-01"
                  className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 focus:shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@tactical.mil"
                required
                className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 focus:shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all"
              />
            </div>

            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                ACCESS CODE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                minLength={6}
                className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 focus:shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 border border-green-400 bg-green-500/10 text-green-400 text-sm tracking-widest hover:bg-green-500/20 hover:shadow-[0_0_16px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {mode === 'signin' ? 'ESTABLISH SECURE LINK' : 'REQUEST CLEARANCE'}
                </>
              )}
            </button>
          </form>

          {/* Security badges */}
          <div className="mt-6 flex items-center justify-between text-xs text-green-700">
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3" />
              <span>AES-256</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>E2E ENCRYPTED</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>SECURE</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-green-800 text-xs tracking-wider">
          // CLASSIFIED // AUTHORIZED PERSONNEL ONLY //
        </p>
      </div>
    </div>
  );
}
