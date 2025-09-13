-- Add salon and sales manager fields to customers table
ALTER TABLE public.customers 
ADD COLUMN salon TEXT,
ADD COLUMN sales_manager TEXT;

-- Update existing form questions to include salon and sales manager options
INSERT INTO public.form_questions (question_text, question_type, options, is_required, display_order) VALUES
('Hansı salon?', 'select', ARRAY['Bakı Mərkəz', 'Bakı Yasamal', 'Bakı Nəsimi', 'Gəncə', 'Sumqayıt', 'Mingəçevir'], true, 5),
('Satış təmsilçisi', 'select', ARRAY['Bakı Mərkəz', 'Bakı Yasamal', 'Bakı Nəsimi', 'Gəncə', 'Sumqayıt', 'Mingəçevir'], true, 6);

-- Create index for better performance on salon and sales_manager queries
CREATE INDEX idx_customers_salon ON public.customers(salon);
CREATE INDEX idx_customers_sales_manager ON public.customers(sales_manager);