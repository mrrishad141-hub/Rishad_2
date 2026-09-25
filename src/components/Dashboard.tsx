import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile, Channel, ChannelMember } from '@/lib/types';
import { generatePassphrase } from '@/lib/crypto';
import {
  Plus, Lock, Radio, Users, LogOut, Settings, Shield,
  Search, Crosshair, Satellite, Radar
} from 'lucide-react';

interface DashboardProps {
  profiles: Record<string, Profile>;
  channels: Channel[];
  members: ChannelMember[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  children?: React.ReactNode;
}

export default function Dashboard({
  profiles,
  channels,
  members,
  activeChannel,
  onSelectChannel,
  onOpenSettings,
  onRefresh,
  children,
}: DashboardProps) {
  const { profile, signOut } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinChannelId, setJoinChannelId] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  // Create channel state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPassphrase, setNewPassphrase] = useState(generatePassphrase());

  const onlineOperators = Object.values(profiles).filter(
    (p) => p.status === 'AVAILABLE' || p.status === 'IN THE FIELD'
  );

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChannel = async () => {
    if (!newName.trim() || !profile) return;

    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        name: newName.toUpperCase(),
        description: newDesc,
        creator_id: profile.id,
        is_encrypted: true,
      })
      .select('*')
      .maybeSingle();

    if (error || !channel) return;

    await supabase.from('channel_members').insert({
      channel_id: channel.id,
      user_id: profile.id,
    });

    // Store passphrase locally (encrypted in browser, never sent to server)
    const channelKeys = JSON.parse(localStorage.getItem('tactical-comms-keys') || '{}');
    channelKeys[channel.id] = newPassphrase;
    localStorage.setItem('tactical-comms-keys', JSON.stringify(channelKeys));

    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setNewPassphrase(generatePassphrase());
    onRefresh();
  };

  const handleJoinChannel = async () => {
    if (!joinChannelId.trim() || !profile) return;

    await supabase.from('channel_members').insert({
      channel_id: joinChannelId.trim(),
      user_id: profile.id,
    });

    setShowJoin(false);
    setJoinChannelId('');
    onRefresh();
  };

  const getChannelMembers = (channelId: string) =>
    members.filter((m) => m.channel_id === channelId);

  return (
    <div className="h-screen flex bg-black font-mono relative overflow-hidden">
      {/* Scan lines */}
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <div className="pointer-events-none fixed inset-0 z-40 vignette" />

      {/* Sidebar */}
      <aside className="w-80 border-r border-green-500/20 flex flex-col z-10 bg-black relative">
        {/* Header */}
        <div className="p-4 border-b border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-400" />
            <h1 className="text-green-400 text-sm font-bold tracking-widest">TACTICAL COMMS</h1>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-600">OPERATOR:</span>
            <span className="text-green-400 font-bold">{profile?.call_sign}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-green-600">CLEARANCE:</span>
            <span className="text-amber-400">
              LVL {profile?.clearance_level}
            </span>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-600 text-xs tracking-widest">CHANNELS</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowJoin(true)}
                  className="text-green-600 hover:text-green-400 transition-colors"
                  title="Join Channel"
                >
                  <Radio className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-green-600 hover:text-green-400 transition-colors"
                  title="Create Channel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-green-700" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH..."
                className="w-full bg-black border border-green-500/20 pl-7 pr-2 py-1.5 text-green-400 placeholder-green-800 text-xs focus:outline-none focus:border-green-400 transition-all"
              />
            </div>

            {/* Channel items */}
            <div className="space-y-1">
              {filteredChannels.length === 0 && (
                <div className="text-green-800 text-xs text-center py-4">
                  NO CHANNELS AVAILABLE
                </div>
              )}
              {filteredChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                const channelMembers = getChannelMembers(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={`w-full text-left p-2 border transition-all group ${
                      isActive
                        ? 'border-green-400 bg-green-500/10 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                        : 'border-transparent hover:border-green-500/30 hover:bg-green-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {channel.is_encrypted && (
                          <Lock className="w-3 h-3 text-green-500 flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs tracking-wider truncate ${
                            isActive ? 'text-green-300' : 'text-green-500'
                          }`}
                        >
                          {channel.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Users className="w-3 h-3 text-green-700" />
                        <span className="text-green-700 text-xs">
                          {channelMembers.length}
                        </span>
                      </div>
                    </div>
                    {channel.description && (
                      <p className="text-green-700 text-xs mt-1 truncate pl-5">
                        {channel.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Online operators */}
        <div className="border-t border-green-500/20 p-3 max-h-48 overflow-y-auto custom-scroll">
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-3 h-3 text-green-500 animate-pulse" />
            <span className="text-green-600 text-xs tracking-widest">
              ACTIVE OPERATORS ({onlineOperators.length})
            </span>
          </div>
          <div className="space-y-1">
            {onlineOperators.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    op.status === 'AVAILABLE'
                      ? 'bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]'
                      : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]'
                  }`}
                />
                <span className="text-green-500">{op.call_sign}</span>
                {op.id === profile?.id && (
                  <span className="text-green-700">(YOU)</span>
                )}
              </div>
            ))}
            {onlineOperators.length === 0 && (
              <div className="text-green-800 text-xs">NO ACTIVE OPERATORS</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-green-500/20 p-3 flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-2 py-2 border border-green-500/20 text-green-600 text-xs tracking-wider hover:border-green-400 hover:text-green-400 transition-all"
          >
            <Settings className="w-3 h-3" />
            SETTINGS
          </button>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 py-2 px-3 border border-red-500/20 text-red-500 text-xs tracking-wider hover:border-red-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </aside>

      {/* Main area - channel placeholder or chat */}
      <main className="flex-1 flex flex-col z-10 relative">
        {/* Top status bar */}
        <div className="border-b border-green-500/20 px-4 py-2 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-4">
            {activeChannel ? (
              <>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm tracking-widest font-bold">
                    {activeChannel.name}
                  </span>
                </div>
                <span className="text-green-700 text-xs">|</span>
                <span className="text-green-600 text-xs">
                  {getChannelMembers(activeChannel.id).length} OPERATORS
                </span>
              </>
            ) : (
              <span className="text-green-600 text-xs tracking-widest">
                SELECT A CHANNEL
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Satellite className="w-3 h-3 text-green-400" />
              <span className="text-green-500">SIG: STRONG</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-400" />
              <span className="text-green-500">AES-256</span>
            </div>
            <ZuluClock />
          </div>
        </div>

        {/* Channel content */}
        <div className="flex-1 overflow-hidden">
          {activeChannel ? (
            children
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Crosshair className="w-16 h-16 text-green-700 mx-auto mb-4" />
                <p className="text-green-600 text-sm tracking-widest">
                  NO CHANNEL SELECTED
                </p>
                <p className="text-green-800 text-xs mt-2">
                  Select a channel from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Channel Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="CREATE NEW CHANNEL">
          <div className="space-y-4">
            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                CHANNEL NAME
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="E.G. ALPHA-SQUAD"
                className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                DESCRIPTION (OPTIONAL)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief mission description..."
                className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                ENCRYPTION PASSPHRASE
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  className="flex-1 bg-black border border-green-500/30 px-3 py-2 text-green-400 text-sm focus:outline-none focus:border-green-400 transition-all"
                />
                <button
                  onClick={() => setNewPassphrase(generatePassphrase())}
                  className="px-3 py-2 border border-green-500/30 text-green-500 text-xs hover:border-green-400 hover:text-green-400 transition-all"
                >
                  REGEN
                </button>
              </div>
              <p className="text-green-700 text-xs mt-1">
                Share this passphrase with squad members so they can decrypt messages
              </p>
            </div>
            <button
              onClick={handleCreateChannel}
              disabled={!newName.trim()}
              className="w-full py-2 border border-green-400 bg-green-500/10 text-green-400 text-sm tracking-widest hover:bg-green-500/20 transition-all disabled:opacity-30"
            >
              [ CREATE CHANNEL ]
            </button>
          </div>
        </Modal>
      )}

      {/* Join Channel Modal */}
      {showJoin && (
        <Modal onClose={() => setShowJoin(false)} title="JOIN CHANNEL">
          <div className="space-y-4">
            <div>
              <label className="block text-green-600 text-xs tracking-widest mb-1">
                CHANNEL ID
              </label>
              <input
                type="text"
                value={joinChannelId}
                onChange={(e) => setJoinChannelId(e.target.value)}
                placeholder="Paste channel ID..."
                className="w-full bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 transition-all"
              />
              <p className="text-green-700 text-xs mt-1">
                Ask the channel creator for the channel ID
              </p>
            </div>
            <button
              onClick={handleJoinChannel}
              disabled={!joinChannelId.trim()}
              className="w-full py-2 border border-green-400 bg-green-500/10 text-green-400 text-sm tracking-widest hover:bg-green-500/20 transition-all disabled:opacity-30"
            >
              [ JOIN CHANNEL ]
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ZuluClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const zuluTime = time.toISOString().slice(11, 19);
  const zuluDate = time.toISOString().slice(0, 10);

  return (
    <div className="text-green-500">
      <span className="text-green-600">{zuluDate}</span>{' '}
      <span className="font-bold">{zuluTime}</span>{' '}
      <span className="text-green-700">ZULU</span>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 border border-green-500/30 bg-black p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-green-400 text-sm font-bold tracking-widest">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-green-600 hover:text-green-400 text-xs"
          >
            [X]
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
