-- ============================================================
-- Rentry Clone – Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- pages table
CREATE TABLE pages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  edit_token    TEXT NOT NULL,
  password_hash TEXT,
  visibility    TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX idx_pages_slug ON pages (slug);

-- sections table (clipboard entries)
CREATE TABLE sections (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title      TEXT DEFAULT '',
  content    TEXT DEFAULT '' CHECK (length(content) <= 102400),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sections_page_id ON sections (page_id);

-- files table (attached to a section, path-based reference)
CREATE TABLE files (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,  -- e.g. uploads/slug/uuid-filename.png
  file_size   BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_files_section_id ON files (section_id);

-- ============================================================
-- Storage: create bucket "uploads" with 50MB max file size
-- in Supabase Dashboard > Storage
-- ============================================================
