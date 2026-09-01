ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_status text,
  ADD COLUMN IF NOT EXISTS fonction_responsabilite text,
  ADD COLUMN IF NOT EXISTS adresse_pays_mission text;