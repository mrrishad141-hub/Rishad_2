import { useEffect, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile, Channel, ChannelMember } from '@/lib/types';
import AuthScreen from '@/components/AuthScreen';
import BootSequence from '@/components/BootSequence';
import Dashboard from '@/components/Dashboard';
import ChatView from '@/components/ChatView';
import SettingsPanel from '@/components/SettingsPanel';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [booted, setBooted] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch all profiles
  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data) {
      const profileMap: Record<string, Profile> = {};
      data.forEach((p) => {
        profileMap[p.id] = p as Profile;
      });
      setProfiles(profileMap);
    }
  }, []);

  // Fetch channels and members for the current user
  const fetchChannelsAndMembers = useCallback(async () => {
    if (!session) return;

    // Get channel memberships for this user
    const { data: userMembers, error: memberError } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', session.user.id);

    if (memberError || !userMembers || userMembers.length === 0) {
      setChannels([]);
      setMembers([]);
      return;
    }

    const channelIds = userMembers.map((m) => m.channel_id);

    // Fetch channels
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds);

    if (channelError || !channelData) return;
    setChannels(channelData as Channel[]);

    // Fetch all members for these channels
    const { data: allMembers, error: allMembersError } = await supabase
      .from('channel_members')
      .select('*')
      .in('channel_id', channelIds);

    if (!allMembersError && allMembers) {
      setMembers(allMembers as ChannelMember[]);
    }
  }, [session]);

  // Realtime subscription for profiles (online status)
  useEffect(() => {
    if (!session) return;

    fetchProfiles();
    fetchChannelsAndMembers();

    const profileSubscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    const channelSubscription = supabase
      .channel('channels-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        () => {
          fetchChannelsAndMembers();
        }
      )
      .subscribe();

    const memberSubscription = supabase
      .channel('members-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_members' },
        () => {
          fetchChannelsAndMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(channelSubscription);
      supabase.removeChannel(memberSubscription);
    };
  }, [session, fetchProfiles, fetchChannelsAndMembers]);

  // Show boot sequence on first load
  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="text-green-500 text-sm tracking-widest animate-pulse">
          LOADING TACTICAL COMMS...
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  return (
    <>
      <Dashboard
        profiles={profiles}
        channels={channels}
        members={members}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
        onOpenSettings={() => setShowSettings(true)}
        onRefresh={() => {
          fetchProfiles();
          fetchChannelsAndMembers();
        }}
      >
        {activeChannel && (
          <ChatView channel={activeChannel} profiles={profiles} />
        )}
      </Dashboard>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
