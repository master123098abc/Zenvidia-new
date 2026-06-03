-- Run this in your Supabase SQL Editor to support the Dual-System Reel Integration

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS behold_feed_id text,
ADD COLUMN IF NOT EXISTS manual_reels_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reel_source_preference text DEFAULT 'BEHOLD';
