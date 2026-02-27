-- AUTO METADATA MICROSTOCK DB SCHEMA
-- Copy dan Paste seluruh script ini ke SQL Editor di Dashboard Supabase Anda
-- (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Master API Keys
CREATE TABLE public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'groq')),
    name TEXT,
    key_value TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy (Aturan): User hanya bisa melihat, menambah, mengedit, menghapus KEY MILIK MEREKA SENDIRI
CREATE POLICY "Users can view own api keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);


-- 2. Fungsi Trigger Otomatis Updated_At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
