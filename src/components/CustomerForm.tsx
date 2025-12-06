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
import { handleError, ErrorContext } from '@/lib/errorHandler';
import { checkIsDeletedColumnExists } from '@/lib/supabaseHelpers';

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
  age_group: string;
  gender: string;
  interested_model: string;
  ad_source: string;
  social_media_platform?: string;
  salon: string;
  sales_manager: string;
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
    age_group: '',
    gender: '',
    interested_model: '',
    ad_source: '',
    salon: '',
    sales_manager: '',
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
      handleError(error, {
        action: 'fetchFormQuestions',
        component: 'CustomerForm',
      }, false); // Don't show toast for form questions as it's not critical
    }
  };

  const searchCustomerByPhone = async (phone: string) => {
    if (phone.length < 10) return;
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    
    setSearching(true);
    try {
      // Check if is_deleted column exists
      const hasIsDeletedColumn = await checkIsDeletedColumnExists();
      
      let query = supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone);
      
      // Apply soft delete filter
      if (hasIsDeletedColumn) {
        query = query.eq('is_deleted', false);
      } else {
        query = query
          .not('full_name', 'like', '[DELETED%')
          .not('age_group', 'eq', '[DELETED]');
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const customerData = data as unknown as Customer;
        setExistingCustomer(customerData);
        setFormData({
          phone: customerData.phone,
          full_name: customerData.full_name,
          age_group: customerData.age_group || '',
          gender: customerData.gender || '',
          interested_model: customerData.interested_model || '',
          ad_source: customerData.ad_source || '',
          salon: customerData.salon || '',
          sales_manager: customerData.sales_manager || '',
          status: customerData.status,
          notes: customerData.notes || ''
        });
        toast.info('Mövcud müştəri tapıldı! Məlumatlar yeniləndi.');
      } else {
        setExistingCustomer(null);
        // Keep phone, reset other fields
        setFormData(prev => ({
          phone: prev.phone,
          full_name: '',
          age_group: '',
          gender: '',
          interested_model: '',
          ad_source: '',
          salon: '',
          sales_manager: '',
          status: 'new_inquiry',
          notes: ''
        }));
      }
    } catch (error) {
      handleError(error, {
        action: 'searchCustomerByPhone',
        component: 'CustomerForm',
        metadata: { phone },
      }, false); // Don't show toast for search errors
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
      if (!formData.full_name || !formData.full_name.trim()) {
        throw new Error('Ad sahəsi mütləqdir');
      }
      
      if (!formData.phone || !formData.phone.trim()) {
        throw new Error('Telefon nömrəsi mütləqdir');
      }
      
      // Clean and validate phone number
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Telefon nömrəsi ən azı 10 rəqəm olmalıdır');
      }

      // Process ad_source - keep it as is
      const finalAdSource = formData.ad_source?.trim() || '';
      
      // Extract social media platform from conditional question if ad_source is "Sosial şəbəkə"
      let socialMediaPlatform: string | undefined = undefined;
      
      // Check if ad_source contains "sosial" or "şəbəkə" (case insensitive)
      const adSourceLower = finalAdSource.toLowerCase();
      const isSocialMedia = adSourceLower.includes('sosial') || 
                           adSourceLower.includes('social') || 
                           adSourceLower.includes('şəbəkə') ||
                           adSourceLower.includes('sebeke');
      
      if (finalAdSource && isSocialMedia) {
        // Find social media parent question (the "Reklam" question)
        const socialMediaParentQuestion = formQuestions.find(q => 
          q.question_text?.toLowerCase().includes('reklam') && 
          q.options?.some(opt => {
            const optLower = opt.toLowerCase();
            return optLower.includes('sosial') || optLower.includes('şəbəkə');
          })
        );
        
        if (socialMediaParentQuestion) {
          // Find conditional question (sub-question) specifically for social media
          // The trigger_value should match the selected ad_source option
          const socialMediaSubQuestion = formQuestions.find(q => 
            q.parent_question_id === socialMediaParentQuestion.id &&
            (q.trigger_value?.toLowerCase().includes('sosial') || 
             q.trigger_value?.toLowerCase().includes('şəbəkə'))
          );
          
          if (socialMediaSubQuestion) {
            // Get the platform from dynamicAnswers
            const platform = dynamicAnswers[socialMediaSubQuestion.id];
            console.log('Social media sub-question found:', {
              subQuestionId: socialMediaSubQuestion.id,
              subQuestionText: socialMediaSubQuestion.question_text,
              triggerValue: socialMediaSubQuestion.trigger_value,
              dynamicAnswers: dynamicAnswers,
              platform: platform
            });
            
            if (platform && platform.trim()) {
              socialMediaPlatform = platform.trim();
              console.log('Social media platform extracted:', { ad_source: finalAdSource, platform: socialMediaPlatform });
            } else {
              console.warn('Social media selected but no platform found in dynamicAnswers:', {
                subQuestionId: socialMediaSubQuestion.id,
                dynamicAnswers: dynamicAnswers
              });
            }
          } else {
            console.warn('Social media parent question found but no matching sub-question found', {
              parentId: socialMediaParentQuestion.id,
              allSubQuestions: formQuestions.filter(q => q.parent_question_id === socialMediaParentQuestion.id)
            });
          }
        } else {
          console.warn('No social media parent question found');
        }
      }

      // Extract TV channel from conditional question if ad_source is "TV"
      let tvChannel: string | undefined = undefined;
      
      if (finalAdSource && finalAdSource.toLowerCase() === 'tv') {
        // Find TV parent question (the "Reklam" question)
        const tvParentQuestion = formQuestions.find(q => 
          q.question_text?.toLowerCase().includes('reklam') && 
          q.options?.some(opt => opt.toLowerCase() === 'tv')
        );
        
        if (tvParentQuestion) {
          // Find conditional question for TV channel
          const tvSubQuestion = formQuestions.find(q => 
            q.parent_question_id === tvParentQuestion.id &&
            q.trigger_value?.toLowerCase() === 'tv'
          );
          
          if (tvSubQuestion) {
            const channel = dynamicAnswers[tvSubQuestion.id];
            
            if (channel && channel.trim()) {
              tvChannel = channel.trim();
              console.log('TV channel extracted:', { ad_source: finalAdSource, channel: tvChannel });
            } else {
              console.warn('TV selected but no channel found in dynamicAnswers:', {
                subQuestionId: tvSubQuestion.id,
                dynamicAnswers: dynamicAnswers
              });
            }
          }
        }
      }

      // Process notes - add any other conditional answers that don't have a direct field mapping
      let finalNotes = formData.notes?.trim() || '';
      const additionalNotes: string[] = [];
      
      // Collect all conditional answers that aren't mapped to fields
      formQuestions.forEach(question => {
        if (question.parent_question_id && dynamicAnswers[question.id]) {
          const parentQuestion = formQuestions.find(q => q.id === question.parent_question_id);
          if (parentQuestion) {
            // Check if this conditional answer is already handled (e.g., social media platform)
            const isSocialMediaPlatform = parentQuestion.question_text?.toLowerCase().includes('reklam') &&
              parentQuestion.options?.some(opt => {
                const optLower = opt.toLowerCase();
                return optLower.includes('sosial') || optLower.includes('şəbəkə') || optLower.includes('social');
              });
            
            if (!isSocialMediaPlatform) {
              // Add to notes if not already in notes
              const answerText = `${question.question_text}: ${dynamicAnswers[question.id]}`;
              if (!finalNotes.includes(answerText)) {
                additionalNotes.push(answerText);
              }
            }
          }
        }
      });
      
      if (additionalNotes.length > 0) {
        finalNotes = finalNotes 
          ? `${finalNotes}\n\n${additionalNotes.join('\n')}`
          : additionalNotes.join('\n');
      }

      // Prepare customer data, excluding empty strings and ensuring required fields
      const customerData: any = {
        phone: cleanPhone, // Use cleaned phone number
        full_name: formData.full_name.trim(),
        created_by: user.id,
        status: formData.status as 'new_inquiry' | 'test_drive_scheduled' | 'negotiating' | 'sold' | 'lost',
        // Only include fields that have values
        ...(formData.age_group && formData.age_group.trim() && { age_group: formData.age_group.trim() }),
        ...(formData.gender && formData.gender.trim() && { gender: formData.gender.trim() }),
        ...(formData.interested_model && formData.interested_model.trim() && { interested_model: formData.interested_model.trim() }),
        ...(finalAdSource && { ad_source: finalAdSource }),
        ...(socialMediaPlatform && { social_media_platform: socialMediaPlatform }),
        ...(tvChannel && { tv_channel: tvChannel }),
        ...(formData.salon && formData.salon.trim() && { salon: formData.salon.trim() }),
        ...(formData.sales_manager && formData.sales_manager.trim() && { sales_manager: formData.sales_manager.trim() }),
        ...(finalNotes && { notes: finalNotes }),
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
        // Check if customer with this phone already exists (including deleted ones)
        const { data: existingPhoneCheck } = await supabase
          .from('customers')
          .select('id, is_deleted, full_name')
          .eq('phone', cleanPhone)
          .maybeSingle();
        
        if (existingPhoneCheck) {
          // If customer exists and is not deleted, treat as update
          const hasIsDeletedColumn = await checkIsDeletedColumnExists();
          const isDeleted = hasIsDeletedColumn 
            ? existingPhoneCheck.is_deleted 
            : existingPhoneCheck.full_name?.includes('[DELETED');
          
          if (!isDeleted) {
            // Customer exists and is not deleted - update instead
            const { error: updateError } = await supabase
              .from('customers')
              .update(customerData)
              .eq('id', existingPhoneCheck.id);
            
            if (updateError) throw updateError;
            toast.success('Müştəri məlumatları uğurla yeniləndi! (Telefon nömrəsi artıq mövcuddur)');
          } else {
            // Customer is deleted - restore it
            const updateData = {
              ...customerData,
              ...(hasIsDeletedColumn ? { is_deleted: false, deleted_at: null } : {})
            };
            
            const { error: restoreError } = await supabase
              .from('customers')
              .update(updateData)
              .eq('id', existingPhoneCheck.id);
            
            if (restoreError) throw restoreError;
            toast.success('Silinmiş müştəri bərpa edildi və yeniləndi!');
          }
        } else {
          // Insert new customer
          const { data: insertedData, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select();
          
          if (error) {
            console.error('Insert error details:', error);
            // Check if it's a unique constraint error
            if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
              throw new Error('Bu telefon nömrəsi ilə müştəri artıq mövcuddur');
            }
            throw error;
          }
          
          if (!insertedData || insertedData.length === 0) {
            throw new Error('Müştəri əlavə edildi, amma məlumat qayıdılmadı');
          }
          
          console.log('Customer inserted successfully:', insertedData);
          toast.success('Yeni müştəri uğurla əlavə edildi!');
        }
      }

      // Reset form
        setFormData({
          phone: '',
          full_name: '',
          age_group: '',
        gender: '',
        interested_model: '',
        ad_source: '',
        salon: '',
        sales_manager: '',
        status: 'new_inquiry',
        notes: ''
      });
      setDynamicAnswers({});
      setExistingCustomer(null);
      onSuccess();
      
    } catch (error: any) {
      const errorMessage = handleError(error, {
        action: existingCustomer ? 'updateCustomer' : 'createCustomer',
        component: 'CustomerForm',
        userId: user?.id,
        metadata: { 
          customerId: existingCustomer?.id,
          hasPhone: !!formData.phone,
        },
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (question: FormQuestion): JSX.Element | null => {
    const fieldName = question.question_text.toLowerCase().includes('yaş') ? 'age_group' :
                     question.question_text.toLowerCase().includes('cins') ? 'gender' :
                     question.question_text.toLowerCase().includes('model') ? 'interested_model' :
                     question.question_text.toLowerCase().includes('reklam') ? 'ad_source' :
                     question.question_text.toLowerCase().includes('salon') ? 'salon' :
                     question.question_text.toLowerCase().includes('satış') ? 'sales_manager' : '';
    
    // Check if this is a phone field
    const isPhoneField = question.question_text.toLowerCase().includes('telefon');
    
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
      // Force phone fields to be text inputs
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
          // Handle multiple checkboxes when options are provided
          if (question.options && question.options.length > 0) {
            const selectedValues = currentValue ? currentValue.split(',').map(v => v.trim()) : [];
            
            const handleCheckboxChange = (option: string, checked: boolean) => {
              let newValues = [...selectedValues];
              if (checked) {
                if (!newValues.includes(option)) {
                  newValues.push(option);
                }
              } else {
                newValues = newValues.filter(v => v !== option);
              }
              handleValueChange(newValues.join(', '));
            };

            return (
              <div className="space-y-2">
                {question.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`checkbox-${question.id}-${option}`}
                      checked={selectedValues.includes(option)}
                      onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                    />
                    <Label
                      htmlFor={`checkbox-${question.id}-${option}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            );
          } else {
            // Single checkbox without options
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
          }
        
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
