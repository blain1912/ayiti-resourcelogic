-- Add contrat_service to correspondence_category enum if not exists
ALTER TYPE correspondence_category ADD VALUE IF NOT EXISTS 'contrat_service';

-- Update the reference generation function to handle contrat
CREATE OR REPLACE FUNCTION public.generate_correspondence_reference(_organization_id uuid, _category text, _document_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  _seq integer;
  _cat_prefix text;
  _type_prefix text;
  _org_code text;
  _ref text;
BEGIN
  _cat_prefix := CASE _category
    WHEN 'attestation_travail' THEN 'AT'
    WHEN 'certificat_travail' THEN 'CT'
    WHEN 'lettre_recommandation' THEN 'LR'
    WHEN 'note_service' THEN 'NS'
    WHEN 'decision' THEN 'DEC'
    WHEN 'convocation' THEN 'CNV'
    WHEN 'mise_en_demeure' THEN 'MED'
    WHEN 'avertissement' THEN 'AV'
    WHEN 'felicitations' THEN 'FEL'
    WHEN 'contrat_service' THEN 'CS'
    ELSE 'DIV'
  END;

  _type_prefix := CASE _document_type
    WHEN 'lettre' THEN 'LT'
    WHEN 'decision' THEN 'DC'
    WHEN 'note' THEN 'NT'
    WHEN 'circulaire' THEN 'CR'
    WHEN 'attestation' THEN 'AT'
    WHEN 'certificat' THEN 'CF'
    WHEN 'convocation' THEN 'CV'
    WHEN 'rapport' THEN 'RP'
    WHEN 'contrat' THEN 'CT'
    ELSE 'XX'
  END;

  SELECT UPPER(LEFT(REPLACE(name, ' ', ''), 6)) INTO _org_code
  FROM organizations WHERE id = _organization_id;

  INSERT INTO correspondence_counters (organization_id, category_prefix, year, last_number)
  VALUES (_organization_id, _cat_prefix, _year, 1)
  ON CONFLICT (organization_id, category_prefix, year)
  DO UPDATE SET last_number = correspondence_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO _seq;

  _ref := 'RH/' || _cat_prefix || '/' || COALESCE(_org_code, 'ORG') || '/' || _year::text || '/' || LPAD(_seq::text, 4, '0');

  RETURN _ref;
END;
$function$;