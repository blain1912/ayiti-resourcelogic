-- Add employee profile fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS code_budgetaire TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS prenom TEXT,
ADD COLUMN IF NOT EXISTS nom TEXT,
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS lieu_naissance TEXT,
ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IN ('M', 'F')),
ADD COLUMN IF NOT EXISTS nationalite TEXT DEFAULT 'Haïtienne',
ADD COLUMN IF NOT EXISTS etat_civil TEXT CHECK (etat_civil IN ('Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', 'Union libre')),
ADD COLUMN IF NOT EXISTS groupe_sanguin TEXT CHECK (groupe_sanguin IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
ADD COLUMN IF NOT EXISTS religion TEXT CHECK (religion IN ('Vodouisant', 'Catholique', 'Protestant', 'Autre')),
ADD COLUMN IF NOT EXISTS nif TEXT,
ADD COLUMN IF NOT EXISTS cin TEXT,
ADD COLUMN IF NOT EXISTS adresse_rue TEXT,
ADD COLUMN IF NOT EXISTS adresse_ville TEXT,
ADD COLUMN IF NOT EXISTS adresse_departement TEXT CHECK (adresse_departement IN ('Artibonite', 'Centre', 'Grand''Anse', 'Nippes', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est')),
ADD COLUMN IF NOT EXISTS code_postal TEXT,
ADD COLUMN IF NOT EXISTS tel_1 TEXT,
ADD COLUMN IF NOT EXISTS tel_2 TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence_nom TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence_prenom TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence_lien TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence_tel TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence_whatsapp TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_code_budgetaire ON profiles(code_budgetaire);
CREATE INDEX IF NOT EXISTS idx_profiles_cin ON profiles(cin);
CREATE INDEX IF NOT EXISTS idx_profiles_nif ON profiles(nif);