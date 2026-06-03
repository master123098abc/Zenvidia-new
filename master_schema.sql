-- Run this in your Supabase SQL Editor to create tables for Zenvidia

-- 1. Create Users/Profiles table (Optional if you rely on auth.users for everything, but helpful)
-- (We use creators and brands to store profile data)

-- 2. Create Creators Table
CREATE TABLE IF NOT EXISTS creators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  full_name text,
  ig_handle text,
  ig_url text,
  yt_url text,
  follower_count integer DEFAULT 0,
  profile_url text,
  primary_niche text,
  secondary_niche text,
  primary_language text,
  secondary_language text,
  city text,
  deal_type text,
  status text DEFAULT 'pending',
  niche text, -- fallback
  behold_feed_id text,
  manual_reels_urls text[] DEFAULT '{}',
  reel_source_preference text DEFAULT 'BEHOLD',
  UNIQUE(user_id)
);

-- 3. Create Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  business_name text,
  business_type text,
  ig_handle text,
  budget text,
  phone text,
  city text,
  profile_url text,
  email text,
  status text DEFAULT 'active',
  UNIQUE(user_id)
);

-- 4. Create Deals (Chat/Collab) Table
CREATE TABLE IF NOT EXISTS deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  brand_id uuid, -- Reference to brand's user_id or brands.id
  creator_id uuid, -- Reference to creator's user_id or creators.id
  brand_name text,
  creator_handle text,
  deal_title text,
  deal_value text,
  deal_status text DEFAULT 'pending',
  collab_type text DEFAULT 'brand_to_creator',
  last_message text DEFAULT '[]'
);

-- 5. Disable Row Level Security temporarily to easily test (Not recommended for production, but avoids the "fail" state while testing)
ALTER TABLE creators DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;

-- If you want RLS enabled instead, uncomment these:
-- ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read" ON creators FOR SELECT USING (true);
-- CREATE POLICY "user can insert" ON creators FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "user can update" ON creators FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "user can delete" ON creators FOR DELETE USING (auth.uid() = user_id);

-- ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read" ON brands FOR SELECT USING (true);
-- CREATE POLICY "user can insert" ON brands FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "user can update" ON brands FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "user can delete" ON brands FOR DELETE USING (auth.uid() = user_id);

-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read" ON deals FOR SELECT USING (true);
-- CREATE POLICY "public insert" ON deals FOR INSERT WITH CHECK (true);
-- CREATE POLICY "public update" ON deals FOR UPDATE USING (true);
