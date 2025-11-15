-- Add new role values to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_general';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_administratif';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_rh';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employe';