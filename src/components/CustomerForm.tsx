import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Search, Save, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface FormQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  display_order: number;
  parent_question_id?: string;
  trigger_value?: string;
  condition_type?: string;
}

interface Customer {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  age_group: string;
  gender: string;
  interested_model: string;
  ad_source: string;
  status: string;
  notes: string;
  created_at: string;
}

interface CustomerFormProps {
  onSuccess: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    full_name: '',
    email: '',
    age_group: '',
    gender: '',
    interested_model: '',
    ad_source: '',
    status: 'new_inquiry',
    notes: ''
  });
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFormQuestions();
  }, []);

  const fetchFormQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setFormQuestions(data || []);
    } catch (error) {
      console.error('Error fetching form questions:', error);
    }
  };

  const searchCustomerByPhone = async (phone: string) => {
    if (phone.length < 10) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setExistingCustomer(data);
        setFormData({
          phone: data.phone,
          full_name: data.full_name,
          email: data.email || '',
          age_group: data.age_group || '',
          gender: data.gender || '',
          interested_model: data.interested_model || '',
          ad_source: data.ad_source || '',
          status: data.status,
          notes: data.notes || ''
        });
        toast.info('Mövcud müştəri tapıldı! Məlumatlar yeniləndi.');
      } else {
        setExistingCustomer(null);
        // Keep phone, reset other fields
        setFormData(prev => ({
          phone: prev.phone,
          full_name: '',
          email: '',
          age_group: '',
          gender: '',
          interested_model: '',
          ad_source: '',
          status: 'new_inquiry',
          notes: ''
        }));
      }
    } catch (error) {
      console.error('Error searching customer:', error);
    } finally {
      setSearching(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    // Clean phone number (remove non-digits)
    const cleanPhone = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, phone: cleanPhone }));
    
    // Auto-search when phone is valid length
    if (cleanPhone.length >= 10) {
      searchCustomerByPhone(cleanPhone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) throw new Error('İstifadəçi tapılmadı');
      
      // Validate required fields
      if (!formData.full_name) {
        throw new Error('Ad sahəsi mütləqdir');
      }

      const customerData = {
        ...formData,
        status: formData.status as 'new_inquiry' | 'test_drive_scheduled' | 'negotiating' | 'sold' | 'lost',
        created_by: user.id
      };

      if (existingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existingCustomer.id);
        
        if (error) throw error;
        toast.success('Müştəri məlumatları uğurla yeniləndi!');
      } else {
        // Insert new customer
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);
        
        if (error) throw error;
        toast.success('Yeni müştəri uğurla əlavə edildi!');
      }

      // Reset form
      setFormData({
        phone: '',
        full_name: '',
        email: '',
        age_group: '',
        gender: '',
        interested_model: '',
        ad_source: '',
        status: 'new_inquiry',
        notes: ''
      });
      setDynamicAnswers({});
      setExistingCustomer(null);
      onSuccess();
      
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (question: FormQuestion): JSX.Element | null => {
    const fieldName = question.question_text.toLowerCase().includes('yaş') ? 'age_group' :
                     question.question_text.toLowerCase().includes('cins') ? 'gender' :
                     question.question_text.toLowerCase().includes('model') ? 'interested_model' :
                     question.question_text.toLowerCase().includes('reklam') ? 'ad_source' : '';
    
    // Check if this is a phone or email field
    const isPhoneField = question.question_text.toLowerCase().includes('telefon');
    const isEmailField = question.question_text.toLowerCase().includes('email');
    
    // Handle conditional questions
    if (question.parent_question_id) {
      const parentQuestion = formQuestions.find(q => q.id === question.parent_question_id);
      if (parentQuestion) {
        const parentFieldName = parentQuestion.question_text.toLowerCase().includes('reklam') ? 'ad_source' : '';
        const parentValue = parentFieldName ? formData[parentFieldName as keyof typeof formData] : dynamicAnswers[question.parent_question_id];
        
        // Check if condition is met
        if (!parentValue || parentValue !== question.trigger_value) {
          return null; // Don't render if condition not met
        }
      }
    }

    const currentValue = fieldName ? formData[fieldName as keyof typeof formData] : dynamicAnswers[question.id];
    
    const handleValueChange = (value: string) => {
      if (fieldName) {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
      } else {
        setDynamicAnswers(prev => ({ ...prev, [question.id]: value }));
      }
    };

    // Render different input types based on question type
    const renderInput = () => {
      // Force phone and email fields to be text inputs
      if (isPhoneField) {
        return (
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="tel"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              className="pl-10 transition-smooth focus:shadow-primary"
            />
          </div>
        );
      }
      
      if (isEmailField) {
        return (
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="email"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              className="pl-10 transition-smooth focus:shadow-primary"
            />
          </div>
        );
      }
      
      switch (question.question_type) {
        case 'select':
        case 'dropdown':
          return (
            <Select
              value={currentValue || ''}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="transition-smooth focus:shadow-primary bg-background">
                <SelectValue placeholder={`${question.question_text} seçin`} />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg">
                {question.options && question.options.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-accent">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        
        case 'text':
        case 'input':
          return (
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              className="transition-smooth focus:shadow-primary"
            />
          );
        
        case 'textarea':
          return (
            <Textarea
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              rows={3}
              className="transition-smooth focus:shadow-primary"
            />
          );
        
        case 'checkbox':
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`checkbox-${question.id}`}
                checked={currentValue === 'true'}
                onCheckedChange={(checked) => handleValueChange(checked ? 'true' : 'false')}
              />
              <Label
                htmlFor={`checkbox-${question.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {question.question_text}
              </Label>
            </div>
          );
        
        default:
          // Default to select for backwards compatibility
          return (
            <Select
              value={currentValue || ''}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="transition-smooth focus:shadow-primary bg-background">
                <SelectValue placeholder={`${question.question_text} seçin`} />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg">
                {question.options && question.options.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-accent">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
      }
    };

    return (
      <div key={question.id} className="form-field">
        <Label className="form-label">
          {question.question_text}
          {question.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {renderInput()}
      </div>
    );
  };

  const renderQuestionWithChildren = (question: FormQuestion): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // Render the parent question
    const parentElement = renderFormField(question);
    if (parentElement) {
      elements.push(parentElement);
    }
    
    // Find and render child questions immediately after parent
    const childQuestions = formQuestions.filter(q => q.parent_question_id === question.id);
    childQuestions.forEach(childQuestion => {
      const childElements = renderQuestionWithChildren(childQuestion);
      elements.push(...childElements);
    });
    
    return elements;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Müştəri Məlumatları</h2>
        <p className="text-muted-foreground">Yeni müştəri əlavə edin və ya mövcudunu yeniləyin</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {existingCustomer ? (
              <>
                <User className="w-5 h-5 text-warning" />
                Mövcud Müştəri Yenilənir
              </>
            ) : (
              <>
                <User className="w-5 h-5 text-primary" />
                Yeni Müştəri Əlavə Et
              </>
            )}
          </CardTitle>
          {existingCustomer && (
            <CardDescription className="text-warning">
              Bu müştəri artıq sistemdə mövcuddur. Məlumatları yeniləyə bilərsiniz.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Phone Number - Special field with search */}
            <div className="form-field">
              <Label htmlFor="phone" className="form-label">
                Telefon Nömrəsi
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="994501234567"
                  className="pl-10 transition-smooth focus:shadow-primary"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <Label htmlFor="full_name" className="form-label">
                  Ad və Soyad <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Müştərinin adı və soyadı"
                  className="transition-smooth focus:shadow-primary"
                  required
                />
              </div>

              <div className="form-field">
                <Label htmlFor="email" className="form-label">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@example.com"
                    className="pl-10 transition-smooth focus:shadow-primary"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Form Fields */}
            <div className="space-y-4">
              {formQuestions
                .filter(q => !q.parent_question_id) // Only render top-level questions
                .filter(q => {
                  // Filter out questions that duplicate static fields
                  const questionText = q.question_text.toLowerCase();
                  return !questionText.includes('telefon') && 
                         !questionText.includes('email') && 
                         !questionText.includes('ad və soyad') &&
                         !questionText.includes('müştərinin adı');
                })
                .map(question => renderQuestionWithChildren(question))
                .flat()}
            </div>


            <Button
              type="submit"
              disabled={loading || !formData.full_name}
              className="w-full gradient-primary text-primary-foreground font-medium py-3 transition-smooth hover:shadow-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saxlanılır...' : (existingCustomer ? 'Məlumatları Yenilə' : 'Müştəri Əlavə Et')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerForm;
