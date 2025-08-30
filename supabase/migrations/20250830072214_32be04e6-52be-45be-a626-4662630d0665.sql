-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'reception');

-- Create enum for customer status
CREATE TYPE public.customer_status AS ENUM ('new_inquiry', 'test_drive_scheduled', 'negotiating', 'sold', 'lost');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'reception',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  age_group TEXT,
  gender TEXT,
  interested_model TEXT,
  ad_source TEXT,
  status customer_status DEFAULT 'new_inquiry',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Reception can view all customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reception can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Reception can update customers they created" ON public.customers
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any customer" ON public.customers
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create form questions table for dynamic forms
CREATE TABLE public.form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'text', 'select', 'radio', 'checkbox'
  options TEXT[], -- Array for select/radio/checkbox options
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage form questions
CREATE POLICY "Admins can manage form questions" ON public.form_questions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view form questions" ON public.form_questions
  FOR SELECT TO authenticated USING (is_active = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default form questions
INSERT INTO public.form_questions (question_text, question_type, options, is_required, display_order) VALUES
('Yaş qrupu', 'select', ARRAY['18-25', '26-35', '36-45', '46-55', '55+'], true, 1),
('Cins', 'select', ARRAY['Kişi', 'Qadın', 'Digər'], true, 2),
('Maraqlandığı model', 'select', ARRAY['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Crossover', 'Luxury', 'Electric'], true, 3),
('Reklam mənbəyi', 'select', ARRAY['Google Ads', 'Facebook', 'Instagram', 'Televizyon', 'Radio', 'Qəzet', 'Dostun tövsiyəsi', 'Digər'], true, 4);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'reception'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();