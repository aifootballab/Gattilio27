-- Creazione Storage Bucket per Screenshot
-- Esegui questo script in Supabase SQL Editor

-- Crea bucket player-screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-screenshots',
  'player-screenshots',
  false, -- Privato
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Crea policy per upload (utenti autenticati possono uploadare)
CREATE POLICY "Users can upload own screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'player-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Crea policy per lettura (utenti possono leggere solo i propri file)
CREATE POLICY "Users can read own screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'player-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Crea policy per eliminazione (utenti possono eliminare solo i propri file)
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'player-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
