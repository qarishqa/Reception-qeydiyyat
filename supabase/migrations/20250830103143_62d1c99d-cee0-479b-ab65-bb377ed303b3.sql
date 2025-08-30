-- Add parent question support for conditional/sub-questions
ALTER TABLE public.form_questions 
ADD COLUMN parent_question_id uuid REFERENCES public.form_questions(id) ON DELETE CASCADE,
ADD COLUMN trigger_value text,
ADD COLUMN condition_type text DEFAULT 'equals';

-- Add comment for clarity
COMMENT ON COLUMN public.form_questions.parent_question_id IS 'Reference to parent question for conditional display';
COMMENT ON COLUMN public.form_questions.trigger_value IS 'Value that triggers this sub-question to show';
COMMENT ON COLUMN public.form_questions.condition_type IS 'Type of condition (equals, contains, etc.)';

-- Update display_order to handle sub-questions better
-- Sub-questions will have same base order as parent + decimal increments
ALTER TABLE public.form_questions ALTER COLUMN display_order TYPE decimal(10,2);