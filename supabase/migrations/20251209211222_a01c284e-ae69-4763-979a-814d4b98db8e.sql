
-- Permettre organization_id NULL pour les catégories et positions template (gérées par super admin)
ALTER TABLE public.employee_categories ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.positions ALTER COLUMN organization_id DROP NOT NULL;

-- Ajouter une colonne pour identifier les templates
ALTER TABLE public.employee_categories ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- Politique RLS pour permettre aux super admins de gérer les templates
CREATE POLICY "Super admins can manage template categories"
ON public.employee_categories
FOR ALL
USING (is_super_admin(auth.uid()) AND organization_id IS NULL)
WITH CHECK (is_super_admin(auth.uid()) AND organization_id IS NULL);

CREATE POLICY "Super admins can manage template positions"
ON public.positions
FOR ALL
USING (is_super_admin(auth.uid()) AND organization_id IS NULL)
WITH CHECK (is_super_admin(auth.uid()) AND organization_id IS NULL);
