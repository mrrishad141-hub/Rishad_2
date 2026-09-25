export interface Profile {
  id: string;
  call_sign: string;
  status: string;
  clearance_level: number;
  avatar_icon: string;
  created_at: string;
  last_seen: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  is_encrypted: boolean;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  encrypted_content: string;
  iv: string;
  self_destruct_at: string | null;
  created_at: string;
  profile?: Profile;
}

export type UserStatus = 'AVAILABLE' | 'IN THE FIELD' | 'OFFLINE';

export const STATUS_COLORS: Record<UserStatus, string> = {
  'AVAILABLE': 'text-green-400',
  'IN THE FIELD': 'text-amber-400',
  'OFFLINE': 'text-gray-500',
};

export const STATUS_DOT_COLORS: Record<UserStatus, string> = {
  'AVAILABLE': 'bg-green-400',
  'IN THE FIELD': 'bg-amber-400',
  'OFFLINE': 'bg-gray-600',
};

export const AVATAR_ICONS = [
  'Shield', 'Crosshair', 'Radio', 'Lock', 'Eye', 'Satellite',
  'Radar', 'Flag', 'Sword', 'Target', 'Headphones', 'Compass'
];

export const CLEARANCE_NAMES: Record<number, string> = {
  1: 'UNCLASSIFIED',
  2: 'CONFIDENTIAL',
  3: 'SECRET',
  4: 'TOP SECRET',
  5: 'BLACK',
};
