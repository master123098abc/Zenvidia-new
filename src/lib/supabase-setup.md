# Supabase Setup for Cross-Path Proximity Features

Run the following SQL commands in your Supabase SQL Editor to enable geolocation features for Zenvidia.

```sql
-- 1. Enable PostGIS extension for geolocation
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add location column to creators table
-- Note: Assuming you are using the 'creators' table for user profiles.
-- The 4326 defines the SRID for standard WSG84 (GPS) coordinate system.
ALTER TABLE creators ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. Create a GIST index for fast proximity queries
CREATE INDEX IF NOT EXISTS creators_location_idx ON creators USING GIST (location);

-- 4. Create an RPC function to find nearby creators
CREATE OR REPLACE FUNCTION get_nearby_creators(
  user_lat double precision,
  user_lon double precision,
  radius_km double precision,
  requesting_user_id uuid
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  ig_handle text,
  profile_url text,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.full_name,
    c.ig_handle,
    c.profile_url,
    ST_Distance(c.location, ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)) / 1000 AS distance_km
  FROM creators c
  WHERE c.user_id != requesting_user_id
    AND c.location IS NOT NULL
    AND ST_DWithin(c.location, ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326), radius_km * 1000)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
```
