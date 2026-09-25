import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserStatus } from '@/lib/types';
import { STATUS_COLORS, AVATAR_ICONS, CLEARANCE_NAMES } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import * as Icons from 'lucide-react';
import { X, Shield, Check } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { profile, updateProfile } = useAuth();
  const [callSign, setCallSign] = useState(profile?.call_sign || '');
  const [status, setStatus] = useState<UserStatus>(
    (profile?.status as UserStatus) || 'AVAILABLE'
  );
  const [avatarIcon, setAvatarIcon] = useState(profile?.avatar_icon || 'Shield');
  const [clearance, setClearance] = useState(profile?.clearance_level || 1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!callSign.trim() || callSign.length < 3) {
      setError('CALL SIGN MUST BE AT LEAST 3 CHARACTERS');
      return;
    }

    setSaving(true);
    setError(null);

    // Check if call sign is taken by someone else
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('call_sign', callSign.toUpperCase())
      .neq('id', profile?.id || '')
      .maybeSingle();

    if (existing) {
      setError('CALL SIGN ALREADY IN USE');
      setSaving(false);
      return;
    }

    await updateProfile({
      call_sign: callSign.toUpperCase(),
      status,
      avatar_icon: avatarIcon,
      clearance_level: clearance,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderIcon = (name: string) => {
    const Icon = (Icons as any)[name] || Icons.Shield;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 border border-green-500/30 bg-black p-6 max-h-[90vh] overflow-y-auto custom-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-green-400 text-sm font-bold tracking-widest">
              OPERATOR SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-green-600 hover:text-green-400 text-xs"
          >
            [X]
          </button>
        </div>

        {/* Current operator info */}
        <div className="border border-green-500/20 p-3 mb-6 bg-green-950/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-green-500/30 flex items-center justify-center text-green-400">
              {renderIcon(avatarIcon)}
            </div>
            <div>
              <p className="text-green-400 text-sm font-bold tracking-wider">
                {profile?.call_sign}
              </p>
              <p className="text-green-700 text-xs">
                CLEARANCE: {CLEARANCE_NAMES[profile?.clearance_level || 1]}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Call Sign */}
          <div>
            <label className="block text-green-600 text-xs tracking-widest mb-1">
              CALL SIGN
            </label>
            <input
              type="text"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 text-sm focus:outline-none focus:border-green-400 transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-green-600 text-xs tracking-widest mb-1">
              OPERATOR STATUS
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['AVAILABLE', 'IN THE FIELD', 'OFFLINE'] as UserStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 border text-xs tracking-wider transition-all ${
                    status === s
                      ? 'border-green-400 bg-green-500/10 text-green-400'
                      : 'border-green-500/20 text-green-700 hover:border-green-500/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        s === 'AVAILABLE'
                          ? 'bg-green-400'
                          : s === 'IN THE FIELD'
                            ? 'bg-amber-400'
                            : 'bg-gray-600'
                      }`}
                    />
                    {s === 'IN THE FIELD' ? 'FIELD' : s}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Icon */}
          <div>
            <label className="block text-green-600 text-xs tracking-widest mb-1">
              TACTICAL INSIGNIA
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => setAvatarIcon(iconName)}
                  className={`p-2 border flex items-center justify-center transition-all ${
                    avatarIcon === iconName
                      ? 'border-green-400 bg-green-500/10 text-green-400'
                      : 'border-green-500/20 text-green-700 hover:border-green-500/40 hover:text-green-500'
                  }`}
                >
                  {renderIcon(iconName)}
                </button>
              ))}
            </div>
          </div>

          {/* Clearance Level */}
          <div>
            <label className="block text-green-600 text-xs tracking-widest mb-1">
              SECURITY CLEARANCE
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setClearance(level)}
                  className={`py-2 border text-xs transition-all ${
                    clearance === level
                      ? level >= 4
                        ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                        : 'border-green-400 bg-green-500/10 text-green-400'
                      : 'border-green-500/20 text-green-700 hover:border-green-500/40'
                  }`}
                >
                  LVL {level}
                </button>
              ))}
            </div>
            <p className="text-green-700 text-xs mt-1">
              {CLEARANCE_NAMES[clearance]}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 px-3 py-2">
              <X className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 border border-green-400 bg-green-500/10 text-green-400 text-sm tracking-widest hover:bg-green-500/20 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              'SAVING...'
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                SETTINGS SAVED
              </>
            ) : (
              '[ SAVE OPERATOR PROFILE ]'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
