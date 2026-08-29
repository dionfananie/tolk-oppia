-- Extend users utk Google OAuth profile (name, avatar) — Tolk.
-- `user_id` berisi google `sub`; email unik utk lookup.
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN google_sub TEXT;
