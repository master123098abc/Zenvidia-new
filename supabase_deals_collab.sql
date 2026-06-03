-- Add collab_type to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS collab_type text DEFAULT 'brand_to_creator';
