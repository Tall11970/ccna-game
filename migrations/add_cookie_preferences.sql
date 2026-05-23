-- Migration: Add cookie_preferences column to profiles table
-- Purpose: Store user's granular cookie consent preferences
-- Date: 2026-05-23
-- Run this script in the Supabase SQL Editor to add cookie preference tracking

ALTER TABLE profiles
ADD COLUMN cookie_preferences TEXT DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN profiles.cookie_preferences IS 'JSON object storing user cookie preferences: {essential: boolean, analytics: boolean, marketing: boolean, timestamp: ISO8601}';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'cookie_preferences';
