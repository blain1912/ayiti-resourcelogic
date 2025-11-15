-- Add employee_category field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN employee_category TEXT CHECK (employee_category IN (
  'Personnel de décision',
  'Personnel d''encadrement', 
  'Personnel Professionnel certifié ou diplômé',
  'Personnel administratif',
  'Personnel de soutien'
));