-- Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'done',
  url         TEXT DEFAULT '',
  year        TEXT DEFAULT '',
  tags        TEXT DEFAULT '',
  emoji       TEXT DEFAULT '🌐',
  img_url     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reset tokens table
CREATE TABLE IF NOT EXISTS reset_tokens (
  token       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- 4. Auto-cleanup old sessions (optional — run manually if needed)
-- DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '8 hours';
-- DELETE FROM reset_tokens WHERE expires_at < NOW();

-- 5. Seed default projects (optional)
INSERT INTO projects (title, category, description, status, url, year, tags, emoji, img_url) VALUES
  ('Frame & Folklore Studio', 'Photography',
   'Premium photography studio site with canvas animations, glassmorphism UI, GSAP scroll-triggered reveals, and WhatsApp booking CTA.',
   'delivered', 'https://athisayarajj.github.io/studio/', '2026', 'GSAP,Canvas,WhatsApp', '📷', ''),
  ('Almighty Trips', 'Travel',
   'Full-stack travel booking app with user auth, admin panel, INR pricing, and dark navy/gold design.',
   'done', '', '2026', 'Flask,Supabase,Admin Panel', '✈️', ''),
  ('AgroSense Farm Manager', 'Other',
   'AI-powered farm management app with Claude API crop recommendations and IoT sensor dashboard.',
   'done', '', '2025', 'Python,FastAPI,AI', '🌾', '')
ON CONFLICT DO NOTHING;
