
-- Add columns for cumul de poste (dual role professor data)
ALTER TABLE public.profiles
ADD COLUMN professor_code_budgetaire text,
ADD COLUMN professor_salary numeric;
