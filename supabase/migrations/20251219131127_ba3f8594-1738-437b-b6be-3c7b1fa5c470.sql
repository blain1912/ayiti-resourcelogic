-- Update the document_type check constraint to include new types
ALTER TABLE public.employee_documents 
DROP CONSTRAINT IF EXISTS employee_documents_document_type_check;

ALTER TABLE public.employee_documents 
ADD CONSTRAINT employee_documents_document_type_check 
CHECK (document_type IN ('cv', 'diplome', 'certificat', 'piece_identite', 'lettre_nomination', 'matricule_fiscale', 'declaration_impot', 'autre'));