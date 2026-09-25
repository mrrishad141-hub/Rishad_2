/*
# Create Tactical Comms Schema - RLS Policies

Security policies for all tables:
- profiles: users can read all profiles, update only their own
- channels: users can read/insert/update/delete channels (creator-scoped, membership-checked)
- channel_members: users can read memberships for channels they belong to, insert/delete their own
- messages: users can read messages in channels they belong to, insert messages in channels they belong to, delete their own
*/

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Channels policies
DROP POLICY IF EXISTS "channels_select_member" ON channels;
CREATE POLICY "channels_select_member"
ON channels FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = channels.id
    AND channel_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "channels_insert_own" ON channels;
CREATE POLICY "channels_insert_own"
ON channels FOR INSERT
TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "channels_update_own" ON channels;
CREATE POLICY "channels_update_own"
ON channels FOR UPDATE
TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "channels_delete_own" ON channels;
CREATE POLICY "channels_delete_own"
ON channels FOR DELETE
TO authenticated USING (auth.uid() = creator_id);

-- Channel members policies
DROP POLICY IF EXISTS "members_select_member" ON channel_members;
CREATE POLICY "members_select_member"
ON channel_members FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "members_insert_own" ON channel_members;
CREATE POLICY "members_insert_own"
ON channel_members FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_delete_own" ON channel_members;
CREATE POLICY "members_delete_own"
ON channel_members FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member"
ON messages FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member"
ON messages FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own"
ON messages FOR DELETE
TO authenticated USING (auth.uid() = user_id);