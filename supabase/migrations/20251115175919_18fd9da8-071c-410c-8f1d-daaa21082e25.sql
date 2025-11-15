-- Ajouter le champ date d'entrée en fonction dans la table profiles
ALTER TABLE public.profiles 
ADD COLUMN date_entree_fonction date;