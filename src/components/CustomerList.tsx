import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Download, 
  Filter, 
  Phone, 
  Mail, 
  Calendar,
  User,
  Car,
  TrendingUp,
  Edit,
  Save,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  phone: string;
  full_name: string;
  email: string;
  age_group: string;
  gender: string;
  interested_model: string;
  ad_source: string;
  status: 'new_inquiry' | 'test_drive_scheduled' | 'negotiating' | 'sold' | 'lost';
  notes: string;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface CustomerListProps {
  onStatsUpdate: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onStatsUpdate }) => {
  const { isAdmin, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [formQuestions, setFormQuestions] = useState<any[]>([]);
  const [editDynamicAnswers, setEditDynamicAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCustomers();
    fetchFormQuestions();
    
    // Set up real-time subscription for customers
    const subscription = supabase
      .channel('customers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          console.log('Real-time customer change:', payload);
          
          if (payload.eventType === 'DELETE') {
            // Remove deleted customer from state
            setCustomers(prevCustomers => 
              prevCustomers.filter(c => c.id !== payload.old.id)
            );
          } else if (payload.eventType === 'INSERT') {
            // Refresh data when new customer is added
            fetchCustomers();
          } else if (payload.eventType === 'UPDATE') {
            // Update specific customer in state
            setCustomers(prevCustomers => 
              prevCustomers.map(c => 
                c.id === payload.new.id ? { ...c, ...payload.new } : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, modelFilter, sourceFilter]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately to get creator names
      const creatorIds = [...new Set(data?.map(customer => customer.created_by).filter(Boolean))];
      
      let profiles = [];
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds);
        profiles = profilesData || [];
      }
      
      // Merge the data
      const customersWithProfiles = data?.map(customer => ({
        ...customer,
        profiles: profiles?.find(profile => profile.user_id === customer.created_by) || null
      }));
      
      setCustomers(customersWithProfiles as any || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müştəri məlumatları yüklənə bilmədi');
    } finally {
      setLoading(false);
    }
  };

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

  const filterCustomers = () => {
    let filtered = customers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter(customer => customer.interested_model === modelFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(customer => customer.ad_source === sourceFilter);
    }

    setFilteredCustomers(filtered);
  };

  const handleTagClick = (filterType: 'model' | 'source' | 'age_group', value: string) => {
    if (filterType === 'model') {
      setModelFilter(value);
    } else if (filterType === 'source') {
      setSourceFilter(value);
    }
    toast.success(`${value} üzrə filterləndi`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'new_inquiry': { label: 'Yeni Sorğu', variant: 'default' as const },
      'test_drive_scheduled': { label: 'Test Sürüşü', variant: 'secondary' as const },
      'negotiating': { label: 'Danışıqlar', variant: 'outline' as const },
      'sold': { label: 'Satıldı', variant: 'default' as const },
      'lost': { label: 'İtkin', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap];
    return (
      <Badge variant={statusInfo?.variant || 'default'}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Ad və Soyad',
      'Telefon',
      'Email',
      'Yaş Qrupu',
      'Cins',
      'Model',
      'Reklam Mənbəyi',
      'Əlavə Etdi',
      'Tarix'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(customer => [
        `"${customer.full_name}"`,
        customer.phone,
        `"${customer.email || ''}"`,
        `"${customer.age_group || ''}"`,
        `"${customer.gender || ''}"`,
        `"${customer.interested_model || ''}"`,
        `"${customer.ad_source || ''}"`,
        `"${customer.profiles?.full_name || ''}"`,
        new Date(customer.created_at).toLocaleDateString('az-AZ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `musterilar-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Məlumatlar CSV faylına export edildi');
  };

  const getUniqueValues = (field: keyof Customer) => {
    return [...new Set(customers.map(customer => customer[field]).filter(Boolean))];
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditFormData({
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      age_group: customer.age_group,
      gender: customer.gender,
      interested_model: customer.interested_model,
      ad_source: customer.ad_source
    });
    setEditDynamicAnswers({});
    setEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !user) return;
    
    setEditLoading(true);
    try {
      const updateData = {
        full_name: editFormData.full_name,
        phone: editFormData.phone,
        email: editFormData.email,
        age_group: editFormData.age_group,
        gender: editFormData.gender,
        interested_model: editFormData.interested_model,
        ad_source: editFormData.ad_source
      };

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', editingCustomer.id);
      
      if (error) throw error;
      
      toast.success('Müştəri məlumatları uğurla yeniləndi!');
      setEditDialogOpen(false);
      setEditingCustomer(null);
      setEditFormData({});
      fetchCustomers();
      onStatsUpdate();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error('Xəta: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const canEditCustomer = (customer: Customer) => {
    return isAdmin || customer.created_by === user?.id;
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!user) return;
    
    const confirmDelete = window.confirm(
      `"${customer.full_name}" adlı müştərini silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.`
    );
    
    if (!confirmDelete) return;
    
    try {
      // Check if user can delete this customer
      const canDelete = isAdmin || customer.created_by === user.id;
      
      if (!canDelete) {
        throw new Error('Müştəri silmək üçün icazəniz yoxdur');
      }

      // Direct delete
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);
      
      if (error) {
        console.error('Direct delete error:', error);
        throw error;
      }
      
      // Remove customer from state and also refresh data to ensure consistency
      // This handles both real-time (production) and manual refresh (localhost)
      setCustomers(prevCustomers => 
        prevCustomers.filter(c => c.id !== customer.id)
      );
      
      // Also refresh the data to ensure consistency (especially for localhost)
      setTimeout(() => {
        fetchCustomers();
      }, 500);
      
      toast.success('Müştəri uğurla silindi!');
      onStatsUpdate();
      
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Xəta: ' + (error.message || 'Müştəri silinərkən xəta baş verdi'));
    }
  };

  const renderEditFormField = (question: any): JSX.Element | null => {
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
        const parentValue = parentFieldName ? editFormData[parentFieldName as keyof typeof editFormData] : editDynamicAnswers[question.parent_question_id];
        
        // Check if condition is met
        if (!parentValue || parentValue !== question.trigger_value) {
          return null; // Don't render if condition not met
        }
      }
    }

    const currentValue = fieldName ? editFormData[fieldName as keyof typeof editFormData] : editDynamicAnswers[question.id];
    
    const handleValueChange = (value: string) => {
      if (fieldName) {
        setEditFormData(prev => ({ ...prev, [fieldName]: value }));
      } else {
        setEditDynamicAnswers(prev => ({ ...prev, [question.id]: value }));
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
              value={String(currentValue || '')}
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
              value={String(currentValue || '')}
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
              value={String(currentValue || '')}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="transition-smooth focus:shadow-primary bg-background">
                <SelectValue placeholder={`${question.question_text} seçin`} />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {question.options && question.options.map((option: string) => (
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
              value={String(currentValue || '')}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              className="transition-smooth focus:shadow-primary"
            />
          );
        
        case 'textarea':
          return (
            <Textarea
              value={String(currentValue || '')}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`${question.question_text} daxil edin`}
              rows={3}
              className="transition-smooth focus:shadow-primary"
            />
          );
        
        default:
          // Default to select for backwards compatibility
          return (
            <Select
              value={String(currentValue || '')}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="transition-smooth focus:shadow-primary bg-background">
                <SelectValue placeholder={`${question.question_text} seçin`} />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {question.options && question.options.map((option: string) => (
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

  const renderEditQuestionWithChildren = (question: any): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // Render the parent question
    const parentElement = renderEditFormField(question);
    if (parentElement) {
      elements.push(parentElement);
    }
    
    // Find and render child questions immediately after parent
    const childQuestions = formQuestions.filter(q => q.parent_question_id === question.id);
    childQuestions.forEach(childQuestion => {
      const childElements = renderEditQuestionWithChildren(childQuestion);
      elements.push(...childElements);
    });
    
    return elements;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Müştərilər yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Müştəri Siyahısı</h2>
          <p className="text-muted-foreground">
            Ümumi {customers.length} müştəri, göstərilir {filteredCustomers.length}
          </p>
        </div>
        
        {isAdmin && (
          <Button 
            onClick={exportToCSV}
            className="gradient-primary text-primary-foreground transition-smooth hover:shadow-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel Export
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Ad, telefon və ya email axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 transition-smooth focus:shadow-primary"
              />
            </div>

            {/* Model Filter */}
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün Modellər</SelectItem>
                {getUniqueValues('interested_model').map((model) => (
                  <SelectItem key={String(model)} value={String(model)}>
                    {String(model)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Reklam Mənbəyi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün Mənbələr</SelectItem>
                {getUniqueValues('ad_source').map((source) => (
                  <SelectItem key={String(source)} value={String(source)}>
                    {String(source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/20">
                  <TableHead className="font-semibold py-4 px-6">Müştəri</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Detallar</TableHead>
                  <TableHead className="font-semibold py-4 px-6">Tarix</TableHead>
                  <TableHead className="font-semibold py-4 px-6 w-20">Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/30 transition-smooth border-b border-border/50">
                    <TableCell className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="font-semibold text-foreground text-base">{customer.full_name}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.notes && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 max-w-xs">
                            {customer.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-wrap gap-2">
                        {customer.age_group && (
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <User className="w-3 h-3 mr-1" />
                            {customer.age_group} • {customer.gender}
                          </Badge>
                        )}
                        {customer.interested_model && (
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            onClick={() => handleTagClick('model', customer.interested_model)}
                          >
                            <Car className="w-3 h-3 mr-1" />
                            {customer.interested_model}
                          </Badge>
                        )}
                        {customer.ad_source && (
                          <Badge 
                            variant="default" 
                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                            onClick={() => handleTagClick('source', customer.ad_source)}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {customer.ad_source}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(customer.created_at).toLocaleDateString('az-AZ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex gap-2">
                        {canEditCustomer(customer) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canEditCustomer(customer) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Müştəri tapılmadı</h3>
              <p className="text-muted-foreground">
                {searchTerm || modelFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Filterlərinizi dəyişdirməyi yoxlayın'
                  : 'Hələ heç bir müştəri əlavə edilməyib'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Müştəri Məlumatlarını Düzəlt
            </DialogTitle>
          </DialogHeader>
          
          {editingCustomer && (
            <div className="space-y-4 py-4">
              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefon Nömrəsi</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="994501234567"
                    className="pl-10 transition-smooth focus:shadow-primary"
                  />
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Ad və Soyad *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={editFormData.full_name || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Müştərinin adı və soyadı"
                    className="transition-smooth focus:shadow-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                      className="pl-10 transition-smooth focus:shadow-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Form Fields - match CustomerForm exactly */}
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
                  .map(question => renderEditQuestionWithChildren(question))
                  .flat()}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={editLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Ləğv et
                </Button>
                <Button
                  onClick={handleUpdateCustomer}
                  disabled={editLoading || !editFormData.full_name}
                  className="gradient-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editLoading ? 'Yenilənir...' : 'Yadda saxla'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerList;