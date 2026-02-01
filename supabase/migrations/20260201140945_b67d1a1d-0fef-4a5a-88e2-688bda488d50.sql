-- Create table for platform settings (legal/ownership info)
CREATE TABLE public.platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage platform settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Everyone can view platform settings (for public pages like About, Terms)
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Insert default ownership info
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES (
    'ownership_info',
    '{
        "company_name": "Ayiti ResourceLogic",
        "email": "contact@ayiti-resourcelogic.com",
        "phone": "+509 XXXX-XXXX",
        "address": "Port-au-Prince, Haïti",
        "description": "Ayiti ResourceLogic est une solution innovante de gestion des ressources humaines développée spécialement pour les organisations haïtiennes."
    }'::jsonb
);