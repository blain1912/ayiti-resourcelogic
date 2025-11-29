-- Permettre organization_id NULL dans user_roles pour les super admins
ALTER TABLE user_roles ALTER COLUMN organization_id DROP NOT NULL;

-- Supprimer le rôle admin actuel lié à l'organisation
DELETE FROM user_roles WHERE user_id = '4de79dc0-454c-45c0-9db1-bfbbedb1531f';

-- Créer le vrai super admin sans organisation
INSERT INTO user_roles (user_id, role, organization_id)
VALUES ('4de79dc0-454c-45c0-9db1-bfbbedb1531f', 'admin', NULL);

-- Mettre à jour le profil pour qu'il n'ait pas d'organisation
UPDATE profiles 
SET organization_id = NULL 
WHERE user_id = '4de79dc0-454c-45c0-9db1-bfbbedb1531f';

-- Mettre à jour la fonction is_super_admin pour vérifier organization_id NULL
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND organization_id IS NULL
  )
$$;