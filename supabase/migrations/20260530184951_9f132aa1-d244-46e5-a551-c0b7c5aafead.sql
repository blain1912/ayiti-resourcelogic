
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS leave_policy jsonb NOT NULL DEFAULT jsonb_build_object(
  'mode', 'seniority_haiti',
  'fixed_annual_days', 20,
  'tiers', jsonb_build_array(
    jsonb_build_object('min_years', 0, 'max_years', 5, 'days', 15),
    jsonb_build_object('min_years', 6, 'max_years', 10, 'days', 20),
    jsonb_build_object('min_years', 11, 'max_years', 999, 'days', 25)
  ),
  'sick_days', 15,
  'maternity_days', 90,
  'paternity_days', 10,
  'exceptional_days', 5,
  'study_days', 30
);
