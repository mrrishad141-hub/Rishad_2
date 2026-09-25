import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile, Channel, Message } from '@/lib/types';
import { decryptMessage, encryptMessage } from '@/lib/crypto';
import {
  Lock, Send, Shield, Clock, AlertTriangle, Loader2,
  Eye, EyeOff, KeyRound, Trash2, Radio
} from 'lucide-react';

interface ChatViewProps {
  channel: Channel;
  profiles: Record<string, Profile>;
}

interface DecryptedMessage extends Message {
  decryptedContent: string;
  decrypted: boolean;
}

export default function ChatView({ channel, profiles }: ChatViewProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphraseError, setPassphraseError] = useState(false);
  const [selfDestruct, setSelfDestruct] = useState<number | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef(channel.id);

  // Load stored passphrase for this channel
  useEffect(() => {
    const keys = JSON.parse(localStorage.getItem('tactical-comms-keys') || '{}');
    if (keys[channel.id]) {
      setPassphrase(keys[channel.id]);
      setShowPassphraseInput(false);
    } else {
      setPassphrase('');
      setShowPassphraseInput(true);
    }
  }, [channel.id]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    const msgs = (data || []) as Message[];
    const keys = JSON.parse(localStorage.getItem('tactical-comms-keys') || '{}');
    const currentPassphrase = keys[channel.id] || passphrase;

    if (currentPassphrase) {
      const decrypted = await Promise.all(
        msgs.map(async (msg) => {
          const content = await decryptMessage(
            msg.encrypted_content,
            msg.iv,
            currentPassphrase
          );
          return {
            ...msg,
            decryptedContent: content,
            decrypted: !content.startsWith('[DECRYPTION FAILED'),
          };
        })
      );
      setMessages(decrypted);
    } else {
      setMessages(
        msgs.map((msg) => ({
          ...msg,
          decryptedContent: '[ENCRYPTED — PASSPHRASE REQUIRED]',
          decrypted: false,
        }))
      );
    }

    setLoading(false);
  }, [channel.id, passphrase]);

  useEffect(() => {
    channelRef.current = channel.id;
    fetchMessages();
  }, [channel.id, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const keys = JSON.parse(localStorage.getItem('tactical-comms-keys') || '{}');
          const currentPassphrase = keys[channel.id] || passphrase;

          if (currentPassphrase) {
            const content = await decryptMessage(
              newMsg.encrypted_content,
              newMsg.iv,
              currentPassphrase
            );
            setMessages((prev) => [
              ...prev,
              {
                ...newMsg,
                decryptedContent: content,
                decrypted: !content.startsWith('[DECRYPTION FAILED'),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                ...newMsg,
                decryptedContent: '[ENCRYPTED — PASSPHRASE REQUIRED]',
                decrypted: false,
              },
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as Message).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel.id, passphrase]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Self-destruct cleanup check
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.filter((m) => {
          if (m.self_destruct_at) {
            return new Date(m.self_destruct_at) > new Date();
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePassphraseSubmit = async () => {
    if (!passphraseInput.trim()) return;

    // Test by trying to decrypt the most recent message
    if (messages.length > 0 && !messages[0].decrypted) {
      const content = await decryptMessage(
        messages[0].encrypted_content,
        messages[0].iv,
        passphraseInput
      );
      if (content.startsWith('[DECRYPTION FAILED')) {
        setPassphraseError(true);
        return;
      }
    }

    setPassphrase(passphraseInput);
    setPassphraseError(false);
    setShowPassphraseInput(false);

    // Store passphrase
    const keys = JSON.parse(localStorage.getItem('tactical-comms-keys') || '{}');
    keys[channel.id] = passphraseInput;
    localStorage.setItem('tactical-comms-keys', JSON.stringify(keys));

    // Re-decrypt all messages
    fetchMessages();
  };

  const handleSend = async () => {
    if (!input.trim() || !profile || !passphrase) return;

    const { ciphertext, iv } = await encryptMessage(input, passphrase);

    const selfDestructAt =
      selfDestruct !== null
        ? new Date(Date.now() + selfDestruct * 1000).toISOString()
        : null;

    await supabase.from('messages').insert({
      channel_id: channel.id,
      user_id: profile.id,
      encrypted_content: ciphertext,
      iv,
      self_destruct_at: selfDestructAt,
    });

    setInput('');
    setSelfDestruct(null);
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (!isTyping) {
      setIsTyping(true);
    }
    if (typingTimer) clearTimeout(typingTimer);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    setTypingTimer(timer);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().slice(11, 19);
  };

  const getTimeUntilDestruct = (destructAt: string) => {
    const ms = new Date(destructAt).getTime() - Date.now();
    if (ms <= 0) return 'EXPIRED';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  if (showPassphraseInput) {
    return (
      <div className="h-full flex items-center justify-center font-mono p-8">
        <div className="w-full max-w-md">
          <div className="border border-green-500/30 bg-green-950/5 p-8 relative">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />

            <div className="text-center mb-6">
              <KeyRound className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-green-400 text-sm font-bold tracking-widest mb-2">
                ENCRYPTION KEY REQUIRED
              </h2>
              <p className="text-green-700 text-xs">
                Enter the passphrase for {channel.name} to decrypt messages
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphraseInput}
                  onChange={(e) => {
                    setPassphraseInput(e.target.value);
                    setPassphraseError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePassphraseSubmit()}
                  placeholder="ENTER PASSPHRASE..."
                  className={`w-full bg-black border px-3 py-2 pr-10 text-green-400 placeholder-green-800 text-sm focus:outline-none transition-all ${
                    passphraseError
                      ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                      : 'border-green-500/30 focus:border-green-400'
                  }`}
                />
                <button
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-green-700 hover:text-green-500"
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passphraseError && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>INVALID PASSPHRASE — DECRYPTION FAILED</span>
                </div>
              )}

              <button
                onClick={handlePassphraseSubmit}
                disabled={!passphraseInput.trim()}
                className="w-full py-2 border border-green-400 bg-green-500/10 text-green-400 text-sm tracking-widest hover:bg-green-500/20 transition-all disabled:opacity-30"
              >
                [ DECRYPT CHANNEL ]
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-mono">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
            <span className="text-green-600 text-xs ml-2 tracking-widest">
              DECRYPTING MESSAGES...
            </span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Radio className="w-10 h-10 text-green-700 mx-auto mb-3" />
              <p className="text-green-700 text-xs tracking-widest">
                NO TRANSMISSIONS YET
              </p>
              <p className="text-green-800 text-xs mt-1">
                Send the first encrypted message
              </p>
            </div>
          </div>
        )}

        {!loading &&
          messages.map((msg) => {
            const sender = profiles[msg.user_id];
            const isOwn = msg.user_id === profile?.id;
            const hasSelfDestruct = !!msg.self_destruct_at;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] border p-3 group ${
                    isOwn
                      ? 'border-green-400/30 bg-green-500/5'
                      : 'border-green-500/20 bg-black/50'
                  } ${hasSelfDestruct ? 'border-amber-500/30' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-500 text-xs font-bold tracking-wider">
                      {sender?.call_sign || 'UNKNOWN'}
                    </span>
                    <span className="text-green-800 text-xs">
                      {formatTime(msg.created_at)}Z
                    </span>
                    {msg.decrypted ? (
                      <Lock className="w-2.5 h-2.5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                    )}
                    {hasSelfDestruct && (
                      <span className="flex items-center gap-1 text-amber-400 text-xs">
                        <Clock className="w-2.5 h-2.5" />
                        {getTimeUntilDestruct(msg.self_destruct_at!)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`text-sm break-words ${
                      msg.decrypted
                        ? isOwn
                          ? 'text-green-300'
                          : 'text-green-400'
                        : 'text-red-500'
                    }`}
                  >
                    {msg.decryptedContent}
                  </div>

                  {/* Delete button for own messages */}
                  {isOwn && (
                    <button
                      onClick={async () => {
                        await supabase.from('messages').delete().eq('id', msg.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 mt-1 text-red-500/50 hover:text-red-400 text-xs transition-opacity flex items-center gap-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>DELETE</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-green-500/20 p-3 bg-black/50">
        {/* Self-destruct indicator */}
        {selfDestruct !== null && (
          <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>SELF-DESTRUCT: {selfDestruct < 60 ? `${selfDestruct}s` : `${Math.floor(selfDestruct / 60)}m`}</span>
            <button
              onClick={() => setSelfDestruct(null)}
              className="text-amber-600 hover:text-amber-400"
            >
              [CANCEL]
            </button>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="text-green-700 text-xs mb-1 flex items-center gap-1">
            <span className="animate-pulse">TRANSMITTING...</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Self-destruct toggle */}
          <button
            onClick={() => {
              if (selfDestruct === null) setSelfDestruct(30);
              else if (selfDestruct === 30) setSelfDestruct(300);
              else if (selfDestruct === 300) setSelfDestruct(3600);
              else setSelfDestruct(null);
            }}
            className={`p-2 border transition-all ${
              selfDestruct !== null
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-green-500/20 text-green-700 hover:text-green-500 hover:border-green-500/40'
            }`}
            title="Self-destruct timer"
          >
            <Clock className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="TYPE ENCRYPTED MESSAGE..."
            className="flex-1 bg-black border border-green-500/30 px-3 py-2 text-green-400 placeholder-green-800 text-sm focus:outline-none focus:border-green-400 focus:shadow-[0_0_8px_rgba(34,197,94,0.2)] transition-all"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 border border-green-400 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-between mt-2 text-xs text-green-800">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>AES-256-GCM ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>E2E SECURE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
