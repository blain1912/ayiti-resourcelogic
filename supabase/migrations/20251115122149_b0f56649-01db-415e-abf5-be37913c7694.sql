-- Create enum for employment types
CREATE TYPE public.employment_type AS ENUM (
  'permanent',
  'contractuel',
  'journalier'
);

-- Create enum for employee status
CREATE TYPE public.employee_status AS ENUM (
  'actif',
  'conge_annuel',
  'conge_maladie',
  'conge_maternite',
  'conge_etudes',
  'mis_a_disposition',
  'transfere',
  'renvoye',
  'decede'
);

-- Add employment_type column to profiles table
ALTER TABLE public.profiles
ADD COLUMN employment_type public.employment_type DEFAULT 'permanent';

-- Add employee_status column to profiles table
ALTER TABLE public.profiles
ADD COLUMN employee_status public.employee_status DEFAULT 'actif';