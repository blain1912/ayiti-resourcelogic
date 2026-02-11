
ALTER TABLE public.organizations
ADD COLUMN pdf_font_size numeric DEFAULT 13,
ADD COLUMN pdf_line_height numeric DEFAULT 1.7,
ADD COLUMN pdf_margin numeric DEFAULT 2.5,
ADD COLUMN pdf_vertical_align text DEFAULT 'bottom';
